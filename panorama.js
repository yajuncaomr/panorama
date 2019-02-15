var Panorama;
(function () {

    class Node {
        constructor(nodeManager, params) {
            this.nodeManager = nodeManager;
            this.imgurl = params.imgurl;
            this.position = params.position;
            this.renderId = params.renderId;
            this.length = params.length || 10000;
            this.cubeGeometry = this.getCubeSkyGeometry();
            this.genMesh();
            this.nodeManager.addChild(this);
            this.setOpacity = this.setOpacity.bind(this);
        }
        getCubeSkyGeometry() {
            let len = this.length;
            var geo = new THREE.CubeGeometry(len, len, len);
            var uvs = geo.faceVertexUvs[0];
            //px
            uvs[2][0] = new THREE.Vector2(0.0003, 0.75);
            uvs[2][1] = new THREE.Vector2(0.0003, 0.5);
            uvs[2][2] = new THREE.Vector2(0.333333, 0.75);
            uvs[3][0] = new THREE.Vector2(0.0003, 0.5);
            uvs[3][1] = new THREE.Vector2(0.333333, 0.5);
            uvs[3][2] = new THREE.Vector2(0.333333, 0.75);
            //nx
            uvs[0][0] = new THREE.Vector2(0.66666, 0.75);
            uvs[0][1] = new THREE.Vector2(0.66666, 0.5);
            uvs[0][2] = new THREE.Vector2(0.9996, 0.75);
            uvs[1][0] = new THREE.Vector2(0.66666, 0.5);
            uvs[1][1] = new THREE.Vector2(0.9996, 0.5);
            uvs[1][2] = new THREE.Vector2(0.9996, 0.75);
            //py
            uvs[4][0] = new THREE.Vector2(0.333334, 1);
            uvs[4][1] = new THREE.Vector2(0.333334, 0.75);
            uvs[4][2] = new THREE.Vector2(0.666666, 1);
            uvs[5][0] = new THREE.Vector2(0.333334, 0.75);
            uvs[5][1] = new THREE.Vector2(0.666666, 0.75);
            uvs[5][2] = new THREE.Vector2(0.666666, 1);
            //ny
            uvs[6][0] = new THREE.Vector2(0.333334, 0.5);
            uvs[6][1] = new THREE.Vector2(0.333334, 0.25);
            uvs[6][2] = new THREE.Vector2(0.66666, 0.5);
            uvs[7][0] = new THREE.Vector2(0.333334, 0.25);
            uvs[7][1] = new THREE.Vector2(0.66666, 0.25);
            uvs[7][2] = new THREE.Vector2(0.66666, 0.5);
            //pz
            uvs[8][0] = new THREE.Vector2(0.333334, 0.75);
            uvs[8][1] = new THREE.Vector2(0.333334, 0.5);
            uvs[8][2] = new THREE.Vector2(0.66666, 0.75);
            uvs[9][0] = new THREE.Vector2(0.333334, 0.5);
            uvs[9][1] = new THREE.Vector2(0.66666, 0.5);
            uvs[9][2] = new THREE.Vector2(0.66666, 0.75);
            //nz
            uvs[10][0] = new THREE.Vector2(0.66666, 0);
            uvs[10][1] = new THREE.Vector2(0.66666, 0.25);
            uvs[10][2] = new THREE.Vector2(0.333334, 0);
            uvs[11][0] = new THREE.Vector2(0.66666, 0.25);
            uvs[11][1] = new THREE.Vector2(0.333334, 0.25);
            uvs[11][2] = new THREE.Vector2(0.333334, 0);
            return geo;
        }
        show() {
            this.mesh.visible = true;
            if (this.mesh.material.opacity < 0.1) {
                this.mesh.material.opacity = 1;
            }
            let { x, y, z } = this.position;
            let currentNode = this.nodeManager.currentNode;
            currentNode && currentNode.hide();
            this.nodeManager.currentNode = this;
            this.nodeManager.camera.position.set(x, y, z);
            this.nodeManager.controls.target.set(x, y, z + 0.01);
        }
        hide() {
            this.mesh.visible = false;
        }
        fadeIn() {
            this.mesh.visible = true;
            var target = { opacity: 1 };
            var tween = new TWEEN.Tween(this.mesh.material);
            tween.to(target, 2000);
            tween.start();
            var scope = this;
            tween.onUpdate(function () {
                scope.mesh.material.needsUpdate = true;
            });
            tween.onComplete(function () {
            });
        }
        fadeOut() {
            var target = { opacity: 0.1 }
            var tween = new TWEEN.Tween(this.mesh.material);
            tween.to(target, 2000);
            tween.start();
            var scope = this;
            tween.onUpdate(function update() {
                scope.mesh.material.needsUpdate = true;
            });
            tween.onComplete(function () {
                scope.mesh.visible = false;
            });
        }
        setOpacity(n) {
            this.mesh.material.opacity = n;
            this.mesh.visible = n !== 0 ? true : false;
            this.mesh.material.needsUpdate = true;
        }
        genMesh() {
            var loader = new THREE.TextureLoader();
            loader.crossOrigin = "anonymous";
            var material = new THREE.MeshBasicMaterial({ color: 0xffffff,alphaTest:0.1, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
            loader.load(this.imgurl, function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                material.map = texture;
                material.needsUpdate = true;
            });
            this.mesh = new THREE.Mesh(this.cubeGeometry, material);
            this.mesh.position.copy(this.position);
            this.mesh.visible = false;
        }

    }

    class NodeManager {
        constructor(panorama) {
            this.children = [];
            this.currentNode = null;
            this.scene = panorama.scene;
            this.camera = panorama.camera;
            this.controls = panorama.controls;
            this.renderer = panorama.renderer;
            this.dom = panorama.dom;
            this.addRotateCallback();
            this.buttonCallback = null;//按钮事件的回调
            this.isMoving = false;
        }
        addChild(child) {
            if (this.children.indexOf(child) < 0) {
                this.children.push(child);
                this.scene.add(child.mesh);
                this.children.length > 1 && this.setButton();
            }
        }
        removeChild(child) {
            var index = this.children.indexOf(child);
            if (index >= 0) {
                this.children.splice(index, 1);
                this.scene.remove(child.mesh);
            }
        }

        showNode(node) {
            if (this.currentNode === node) {
                return;
            }
            if(this.isMoving){
                return;
            }
            this.isMoving = true;
            var currentNode = this.currentNode;
            var oldCameraPos = this.camera.position.clone();
            var nodePos = node.position.clone();
            var oldTarget = this.controls.target.clone();//初始target
            var startTarget = oldTarget.clone();
            var directionVector = oldCameraPos.clone().sub(oldTarget);
            var newTarget = new THREE.Vector3(nodePos.x, nodePos.y, nodePos.z + 0.01);//结束target
            var sumDistance = startTarget.distanceTo(newTarget);//总距离

            var tween = new TWEEN.Tween(oldTarget);
            tween.easing(TWEEN.Easing.Quadratic.InOut);
            tween.to(newTarget, 2000);
            tween.start();
            this.hideAllButton();
            var curNodeLength = this.currentNode.length / 2;//当前节点内可相机移动范围的直径
            var proportion = curNodeLength / sumDistance;
            var scope = this;
            tween.onUpdate(function () {
                let curDistanceToStart = startTarget.distanceTo(oldTarget);//到旧控制点的距离
                let curDistanceToEnd = newTarget.distanceTo(oldTarget);//到最终控制点的距离
                let v1;
                let v2;
                let curTarget,curCamera;
                //将两点之间的实际距离分为两半                                                                                 
                if (curDistanceToEnd > sumDistance / 2) {
                    v1 = startTarget.clone().multiplyScalar(1 - proportion).clone();
                } else {
                    v1 = newTarget.clone().multiplyScalar(1 - proportion).clone();
                    currentNode && currentNode.setOpacity(0);
                    node.setOpacity(1);
                }
                // if(curDistanceToEnd < curNodeLength/2){
                //     currentNode && currentNode.setOpacity(1 - curDistanceToStart / sumDistance);
                // }
                v2 = oldTarget.clone().multiplyScalar(proportion).clone();
                curTarget = v1.add(v2);
                curCamera = curTarget.clone().add(directionVector);
                let{x,y,z} = curTarget;
                scope.controls.target.set(x, y, z);
                scope.camera.position.set(curCamera.x, curCamera.y, curCamera.z);
            });
            tween.onComplete(function () {
                scope.currentNode = node;
                scope.updateButtons();
                scope.isMoving = false;
            });

        }
        updateImage(imgSrc, node, fn) {
            var loader = new THREE.TextureLoader();
            loader.crossOrigin = "anonymous";
            loader.load(imgSrc, function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                node.mesh.material.map = texture;
                node.mesh.material.needsUpdate = true;
                typeof fn == 'function' && fn();
            });
        }
        setButton() {
            var self = this;
            this.children.forEach(function (v, i) {
                if (v.buttonDom) return false;
                var div = document.createElement('div');
                div.textContent = '场景' + (i + 1);
                div.classList.add('switch');
                div.style.display = 'none';
                self.dom.appendChild(div);
                v.buttonDom = div;
                (function () {
                    v.buttonDom.addEventListener('click', function (ev) {
                        self.showNode(v);
                        typeof self.buttonCallback == 'function' && self.buttonCallback(i);
                    }, false)
                })(v,i);

            });
        }
        addRotateCallback() {
            var self = this;
            this.controls.callbackFunctions.onRotate = function (ev) {
                self.updateButtons();
            };
        }
        hideAllButton(){
            this.children.forEach(function (item) {
                var button = item.buttonDom;
                button.style.display = 'none';
            });
        }
        updateButtons() {
            let self = this;
            if (this.children.length <= 1) return;
            this.children.forEach(function (item) {
                var screen = self.get_projector(item.position.clone(), self.camera);
                var button = item.buttonDom;
                if (screen.x > 0 && screen.y > 0 && screen.isFront && self.currentNode != item) {
                    button.style.left = screen.x + 'px';
                    button.style.bottom = screen.y + 'px';
                    button.style.display = 'block';
                    return item;
                } else {
                    button.style.display = 'none';
                }
            });
        }
        get_projector(world_vector, camera) {
            var HalfBrowseWidth = this.dom.offsetWidth / 2;
            var HalfBrowseHeight = this.dom.offsetHeight / 2;
            var vector = world_vector.project(camera);
            console.log(vector)
            var result = {
                x: Math.round(vector.x * HalfBrowseWidth + HalfBrowseWidth),
                y: Math.round(vector.y * HalfBrowseHeight + HalfBrowseHeight),
                isFront:vector.z < 1
            };
            return result;
        }
    }

    Panorama = class Panorama {
        constructor(dom) {
            this.dom = dom;
            this.Node = Node;
            this.onWindowResize = this.onWindowResize.bind(this);
            this.init();
            this.animate = this.animate.bind(this);
            this.animate();
            this.nodeManager = new NodeManager(this);
        }
        init() {
            var container = this.dom;
            this.renderer = new THREE.WebGLRenderer({ alpha: true });
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(this.dom.offsetWidth, this.dom.offsetHeight);
            this.renderer.setClearColor(0xffffff, 0);
            container.appendChild(this.renderer.domElement);

            this.scene = new THREE.Scene();

            this.camera = new THREE.PerspectiveCamera(90, this.dom.offsetWidth / this.dom.offsetHeight, 0.1, 100000);
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.target.z = 0.01;
            Object.assign(this.controls, {
                enableZoom: false,
                enablePan: false,
                enableDamping: true,
                rotateSpeed: -0.25,
                autoRotateSpeed: 0.25
            });
            window.addEventListener('resize', this.onWindowResize, false);
        }
        onWindowResize() {
            this.camera.aspect = this.dom.offsetWidth / this.dom.offsetHeight;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(this.dom.offsetWidth, this.dom.offsetHeight);
        }
        animate() {
            this.animateId = requestAnimationFrame(this.animate);
            TWEEN.update();
            this.renderer.render(this.scene, this.camera);
            this.controls.update(); // required when damping is enabled
        }
        dispose() {
            this.controls.dispose();
            this.renderer.domElement.remove();
            this.nodeManager.children.forEach(function (v) {
                v.buttonDom && v.buttonDom.remove();
            });
            cancelAnimationFrame(this.animateId);
        }
    };
})();