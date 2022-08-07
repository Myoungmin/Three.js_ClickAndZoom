import * as Three from '../three.js/three.module.js';
import { OrbitControls } from '../three.js/OrbitControls.js';
import { GLTFLoader } from '../three.js/GLTFLoader.js';

// Object3D를 구성하는 요소들의 이름 목록을 표시해주는 메서드
function dumpObject(obj, lines = [], isLast = true, prefix = '') {
    const localPrefix = isLast ? '└─' : '├─';
    lines.push(`${prefix}${prefix ? localPrefix : ''}${obj.name || '*no-name*'} [${obj.type}]`);
    const newPrefix = prefix + (isLast ? '  ' : '│ ');
    const lastNdx = obj.children.length - 1;
    obj.children.forEach((child, ndx) => {
        const isLast = ndx === lastNdx;
        dumpObject(child, lines, isLast, newPrefix);
    });
    return lines;
}

class App {
    constructor() {
        // id가 webgl-container인 div요소를 얻어와서, 상수에 저장 
        const divContainer = document.querySelector("#webgl-container");
        // 얻어온 상수를 클래스 필드에 정의
        // 다른 메서드에서 참조할 수 있도록 필드에 정의한다.
        this._divContainer = divContainer;

        // 렌더러 생성, Three.js의 WebGLRenderer 클래스로 생성
        // antialias를 활성화 시키면 렌더링될 때 오브젝트들의 경계선이 계단 현상 없이 부드럽게 표현된다.
        const renderer = new Three.WebGLRenderer({ antialias: true });
        // window의 devicePixelRatio 속성을 얻어와 PixelRatio 설정
        // 디스플레이 설정의 배율값을 얻어온다.
        renderer.setPixelRatio(window.devicePixelRatio);
        // domElement를 자식으로 추가.
        // canvas 타입의 DOM 객체이다.
        // 문서 객체 모델(DOM, Document Object Model)은 XML이나 HTML 문서에 접근하기 위한 일종의 인터페이스.
        divContainer.appendChild(renderer.domElement);

        // 렌더러의 shadowMap 활성화
        renderer.shadowMap.enabled = true;
        // 더 나은 품질의 그림자를 위해 추가하는 코드
        renderer.shadowMap.type = Three.PCFSoftShadowMap;

        // 다른 메서드에서 참조할 수 있도록 필드에 정의한다.
        this._renderer = renderer;

        // Scene 객체 생성
        const scene = new Three.Scene();
        // 다른 메서드에서 참조할 수 있도록 필드에 정의한다.
        this._scene = scene;

        // 카메라 객체를 구성
        this._setupCamera();
        // 조명 설정
        this._setupLight();
        // 3D 모델 설정
        this._setupModel();
        // 마우스 컨트롤 설정
        this._setupControls();
        // 모델 더블클릭 확인 설정
        this._setupPicking();


        // 창 크기가 변경될 때 발생하는 이벤트인 onresize에 App 클래스의 resize 메서드를 연결한다.
        // this가 가리키는 객체가 이벤트 객체가 아닌 App클래스 객체가 되도록 하기 위해 bind로 설정한다.
        // onresize 이벤트가 필요한 이유는 렌더러와 카메라는 창 크기가 변경될 때마다 그 크기에 맞게 속성값을 재설정해줘야 한다.
        window.onresize = this.resize.bind(this);
        // onresize 이벤트와 상관없이 생성자에서 resize 메서드를 호출한다.
        // 렌더러와 카메라의 속성을 창크기에 맞게 설정해준다. 
        this.resize();

        // render 메서드를 requestAnimationFrame이라는 API에 넘겨줘서 호출해준다.
        // render 메서드 안에서 쓰이는 this가 App 클래스 객체를 가리키도록 하기 위해 bind 사용
        requestAnimationFrame(this.render.bind(this));
    }

    _setupCamera() {
        // 3D 그래픽을 출력할 영역 width, height 얻어오기
        const width = this._divContainer.clientWidth;
        const height = this._divContainer.clientHeight;
        // 얻어온 크기를 바탕으로 Perspective 카메라 객체 생성
        const camera = new Three.PerspectiveCamera(
            75,
            width / height,
            0.1,
            100
        );
        camera.position.z = 2;
        // 다른 메서드에서 참조할 수 있도록 필드에 정의한다.
        this._camera = camera;
    }

    _setupLight() {
        // HemisphereLight 추가
        const ambientLight = new Three.HemisphereLight(0xffffff, 0x444444, 0.4);
        this._scene.add(ambientLight);


        // 모델을 비추는 DirectionalLight 2개 추가
        const color = 0xffffff;
        const intensity = 1.5;

        const light1 = new Three.DirectionalLight(color, intensity);
        light1.position.set(-1.5, 4, 0);
        this._scene.add(light1);

        const light2 = new Three.DirectionalLight(color, intensity);
        // light2에서만 그림자를 던지도록 설정한다.
        light2.castShadow = true;
        light2.position.set(1.5, 4, 0);
        // 좋은 품질의 그림자를 위한 설정들////////////////////////////////////////
        light2.shadow.mapSize.width = light2.shadow.mapSize.height = 1024 * 10;
        light2.shadow.radius = 4;
        light2.shadow.bias = 0.0001;
        //////////////////////////////////////////////////////////////////////////
        this._scene.add(light2);
    }

    _setupModel() {
        const gltfLoader = new GLTFLoader();

        const items = [
            // 모델 왼쪽 바퀴 removed에 설정
            { url: "../data/mazda_rx-7/scene.gltf", removed: "front_left_wheel" },
            // 모델 방패 removed에 설정
            { url: "../data/warcraft_3_alliance_footmanfanmade/scene.gltf", removed: "Object_27" },
        ];

        items.forEach((item, index) => {
            gltfLoader.load(item.url, (gltf) => {
                const obj3d = gltf.scene;

                // 모델의 특정 요소 제거
                const removedObj3d = obj3d.getObjectByName(item.removed);
                removedObj3d.removeFromParent();

                const box = new Three.Box3().setFromObject(obj3d);
                // 모델의 높이를 가져온다.
                const sizeBox = box.max.y - box.min.y;
                // 높이의 크기를 1로 맞추기 위한 배율
                const scale = 1 / sizeBox;
                // position을 적당하게 떨어져 위치 시키기 위해 x 좌표 설정
                const tx = ((index / (items.length - 1)) - 0.5) * 3;
                // 높이의 크기를 1로 맞추기 위한 배율로 전체 크기 조정
                obj3d.scale.set(scale, scale, scale);
                // 모델 위치 지정
                obj3d.position.set(tx, -box.min.y * scale, 0);

                // 모델 Scene에 추가
                this._scene.add(obj3d);
                obj3d.name = "model";

                // // 모델 크기를 확인해보기 위해 BoxHelper 추가
                // this._scene.add(new Three.BoxHelper(obj3d));
                // // 모델을 구성하는 요소의 이름을 콘솔에 표시
                // console.log(dumpObject(obj3d).join('\n'));

                // 모델을 구성하는 모든 요소들에 대해 그림자를 던지고 받을 수 있도록 설정
                obj3d.traverse(child => {
                    child.castShadow = true;
                    child.receiveShadow = true;
                });
            });
        });

        // cylinderGeometry로 Mesh 생성하여 원형판 Scene에 추가
        const cylinderGeometry = new Three.CylinderGeometry(3.5, 3.5, 0.1, 64);
        const cylinderMaterial = new Three.MeshStandardMaterial(
            { color: 0x454545, metalness: 0.5, roughness: 0.5 }
        );
        const cylinder = new Three.Mesh(cylinderGeometry, cylinderMaterial);

        // 모델은 그림자를 던지지 않고 받기만 한다.
        cylinder.receiveShadow = true;
        // 모델이 아닌 다른 곳을 더블클릭 시 무대를 확대하기 위해 이름을 지정한다.
        cylinder.name = "cylinder";

        cylinder.position.y = -0.05;
        this._scene.add(cylinder);
    }

    // 클릭 시 어떤 모델이 선택되었는지 확인하는 메서드
    _setupPicking() {
        const raycaster = new Three.Raycaster();
        this._divContainer.addEventListener("dblclick", this._onDblClick.bind(this));
        this._raycaster = raycaster;
    }

    // 더블클릭 이벤트 핸들러
    _onDblClick(event) {
        // Picking에 필요한 준비 코드
        const width = this._divContainer.clientWidth;
        const height = this._divContainer.clientHeight;
        const xy = {
            x: (event.offsetX / width) * 2 - 1,
            y: -(event.offsetY / height) * 2 + 1
        }
        this._raycaster.setFromCamera(xy, this._camera);

        // models 배열에 이름이 "model"인 모델들만 담는다.
        const models = [];
        this._scene.traverse(obj3d => {
            if (obj3d.name === "model") {
                models.push(obj3d);
            }
        });

        for (let i = 0; i < models.length; i++) {
            const model = models[i];
            const targets = this._raycaster.intersectObject(model);
            if (targets.length > 0) {
                // 더블클릭된 모델 확대하는 로직
                this._zoomFit(model, 70);
                return;
            }
        }

        // 더블클릭이 모델에서 이루어지지 못하면 아래 코드 실행
        const cylinder = this._scene.getObjectByName("cylinder");

        // 무대를 확대하는 로직
        this._zoomFit(cylinder, 45);
    }

    // 모델을 확대하는 메서드
    _zoomFit(object3d, viewAngle) {
        // 모델의 바운딩박스를 구한다.
        const box = new Three.Box3().setFromObject(object3d);
        // 박스를 가로지르는 대각선 길이를 구한다.
        const sizeBox = box.getSize(new Three.Vector3()).length();
        // 박스의 중심을 구한다. 카메라가 바라보는 타깃 지점으로 지정할 예정이다.
        const centerBox = box.getCenter(new Three.Vector3());

        // y축 방향 단위벡터로 방향으로 초기화
        const direction = new Three.Vector3(0, 1, 0);
        // 파라미터로 넘겨받은 viewAngle만큼 X축으로 회전한다.
        direction.applyAxisAngle(new Three.Vector3(1, 0, 0), Three.MathUtils.degToRad(viewAngle));

        // 박스를 가로지르는 대각선 길이의 절반을 halfSizeModel로 설정
        const halfSizeModel = sizeBox * 0.5;
        // 카메라의 fov의 절반을 halfov로 설정
        const halffov = Three.MathUtils.degToRad(this._camera.fov * .5);
        // 모델을 확대했을 때 거리
        // 삼각함수를 통해서 거리를 구한다.
        const distance = halfSizeModel / Math.tan(halffov);
        // 확대했을 때 카메라의 새로운 위치
        // direction의 단위 벡터에 distance 값을 곱해주면 거리와 방향의 성질을 갖는 벡터를 얻을 수 있다.
        // 위치벡터인 centerBox를 더해주면 위치의 성질도 추가
        // 이렇게 3차원 좌표로 활용가능하다.
        const newPosition = new Three.Vector3().copy(
            direction.multiplyScalar(distance).add(centerBox));

        //this._camera.position.copy(newPosition);
        // 카메라의 위치를 GSAP를 사용하여 0.5초동안 단계적으로 변하도록 설정
        gsap.to(this._camera.position, { duration: 0.5, x: newPosition.x, y: newPosition.y, z: newPosition.z });

        //this._contorls.target.copy(centerBox);
        // 카메라가 바라보는 target을 GSAP를 사용하여 0.5초동안 단계적으로 변하도록 설정
        gsap.to(this._controls.target, {
            duration: 0.5, x: centerBox.x, y: centerBox.y, z: centerBox.z,
            // 애니메이션 프레임마다 호출되어 깜빡거림을 방지하기 위한 조치
            onUpdate: () => {
                this._camera.lookAt(this._controls.target.x, this._controls.target.y, this._controls.target.z);
            }
        }
        );
    }


    _setupControls() {
        // _zoomFit 메서드에서 사용할 수 있게 필드화
        this._controls = new OrbitControls(this._camera, this._divContainer);
    }

    resize() {
        // 3D 그래픽을 출력할 영역 width, height 얻어오기
        const width = this._divContainer.clientWidth;
        const height = this._divContainer.clientHeight;

        // 출력할 영역 width, height로 aspect 계산하여 카메라 aspect를 설정
        this._camera.aspect = width / height;
        // 변경된 aspect를 바탕으로 ProjectionMatrix 업데이트
        this._camera.updateProjectionMatrix();

        // 출력 영역 크기를 바탕으로 렌더러 크기 설정
        this._renderer.setSize(width, height);
    }

    render(time) {
        // Scene을 카메라 시점으로 렌더링하라는 코드
        this._renderer.render(this._scene, this._camera);
        // update 메서드 안에서는 time 인자를 바탕으로 애니메이션 효과 발생
        this.update(time);
        // requestAnimationFrame을 통하여 render 메서드가 반복적으로 호출될 수 있다.
        requestAnimationFrame(this.render.bind(this));
    }

    update(time) {
        // 밀리초에서 초로 변환
        time *= 0.001;
        this._controls.update();
    }
}

window.onload = function () {
    new App();
}