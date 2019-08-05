var Panorama;
(function () {

    class Node {
        constructor(nodeManager, params) {
            this.nodeManager = nodeManager;
            this.imgurl = params.imgurl;
            this.position = params.position;
            this.renderId = params.renderId;
            this.length = params.length || 1;
            this.cubeGeometry = this.getCubeSkyGeometry(this.length);
            this.mesh = this.genMesh(this.cubeGeometry);
            this.createCover();
            this.nodeManager.addChild(this);
            this.setOpacity = this.setOpacity.bind(this);
        }
        createCover() {
            this.covercubeGeometry = this.getCubeSkyGeometry(3);
            this.coverMesh = this.genMesh(this.covercubeGeometry);
        }
        showCover() {
            this.coverMesh.visible = true;
            if (this.coverMesh.material.opacity < 0.1) {
                this.coverMesh.material.opacity = 1;
            }
        }
        setCoverOpacity(n) {
            this.coverMesh.material.opacity = n;
            this.coverMesh.visible = n !== 0 ? true : false;
            this.coverMesh.material.needsUpdate = true;
        }
        getCubeSkyGeometry(length) {
            let len = length;
            var geo = new THREE.CubeGeometry(len, len, len);
            return geo;
        }
        show() {
            this.mesh.visible = true;
            this.mesh.material.forEach(material => {
                if (material.opacity < 0.1) {
                    material.opacity = 1;
                }
            })

            let { x, y, z } = this.position;
            let currentNode = this.nodeManager.currentNode;
            currentNode && currentNode.hide();
            this.nodeManager.currentNode = this;
            this.nodeManager.camera.fov = 75;
            this.nodeManager.camera.updateProjectionMatrix();
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
            this.mesh.visible = n !== 0 ? true : false;
            this.mesh.material.forEach(material => {
                material.opacity = n;
                material.needsUpdate = true;
            });
        }
        genMesh(cubeGeometry) {
            var mesh;
            var textures = this.getTexturesFromAtlasFile(this.imgurl, 6);
            var materials = [];
            for (var i = 0; i < 6; i++) {
                var material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.FrontSide, depthWrite: true, map: textures[i] });
                materials.push(material);
            }
            mesh = new THREE.Mesh(cubeGeometry, materials);
            mesh.geometry.scale(1, 1, -1);
            mesh.position.copy(this.position);
            mesh.visible = false;
            return mesh;
        }
        setCoverPosition(position) {
            this.coverMesh.position.copy(position);
        }
        getTexturesFromAtlasFile(atlasImgUrl, tilesNum) {
            var textures = [];
            for (var i = 0; i < tilesNum; i++) {
                textures[i] = new THREE.Texture();
            }
            var imageObj = new Image();
            imageObj.crossOrigin = "anonymous";
            var arr = [{ x: 0, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 1 }];
            imageObj.onload = function () {
                var canvas, context;
                var tileWidth = imageObj.height / 4;
                for (var i = 0; i < textures.length; i++) {
                    canvas = document.createElement('canvas');
                    context = canvas.getContext('2d');
                    canvas.height = tileWidth;
                    canvas.width = tileWidth;
                    if (i == 2 || i == 3 || i == 4) {
                        context.translate(tileWidth, tileWidth);
                        context.rotate(180 * Math.PI / 180);
                    }
                    context.drawImage(imageObj, tileWidth * arr[i].x, tileWidth * arr[i].y, tileWidth, tileWidth, 0, 0, tileWidth, tileWidth);

                    textures[i].image = canvas;
                    textures[i].needsUpdate = true;
                }
            };
            imageObj.src = atlasImgUrl;
            return textures;
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
            this.switchBegain = null;
            this.moveDoneCallback = null;
            this.isMoving = false;
        }
        addChild(child) {
            this.children.push(child);
            this.scene.add(child.mesh, child.coverMesh);
            this.children.length > 1 && this.setButton();
        }
        removeChild(child) {
            var index = this.children.indexOf(child);
            if (index >= 0) {
                this.children.splice(index, 1);
                child.buttonDom.remove();
                this.scene.remove(child.mesh);
            }
        }
        showNode(node) {
            if (this.currentNode === node) {
                return;
            }
            var currentNodePos = this.currentNode.mesh.position.clone();
            var nodePos = node.position.clone();
            if (JSON.stringify(currentNodePos) == JSON.stringify(nodePos)) {
                //两个位置一样的节点
                this.currentNode.setOpacity(0);
                node.setOpacity(1);
                this.currentNode = node;
                this.updateButtons();
                return;
            }
            if (this.isMoving) {
                return;
            }
            this.isMoving = true;
            var currentNode = this.currentNode;
            var oldCameraPos = this.camera.position.clone();
            var oldTarget = this.controls.target.clone();//初始target
            var startTarget = oldTarget.clone();
            var directionVector = oldCameraPos.clone().sub(oldTarget);
            var newTarget = new THREE.Vector3(nodePos.x, nodePos.y, nodePos.z + 0.01);//结束target
            var sumDistance = startTarget.distanceTo(newTarget);//总距离

            var tween = new TWEEN.Tween(oldTarget);
            var animateDuration = sumDistance < 50 ? 1000 : sumDistance < 100 ? sumDistance * 30 : 3000;
            tween.easing(TWEEN.Easing.Quadratic.InOut);
            tween.to(newTarget, animateDuration);
            tween.start();
            this.hideAllButton();
            this.switchBegain && this.switchBegain();//开始切换的回调
            var curNodeLength = this.currentNode.length / 2;//当前节点内可相机移动范围的直径
            var unitVector = newTarget.clone().sub(oldTarget).normalize();
            var addVector = unitVector.multiplyScalar(curNodeLength * 3 / 2);

            var proportion = curNodeLength / sumDistance;
            var scope = this;
            node.showCover();
            // node.setCoverOpacity(0.4)
            tween.onUpdate(function () {
                let curDistanceToStart = startTarget.distanceTo(oldTarget);//到旧控制点的距离
                let curDistanceToEnd = newTarget.distanceTo(oldTarget);//到最终控制点的距离
                let v1;
                let v2;
                let curTarget, curCamera, coverPosition;

                //将两点之间的实际距离分为两半                                                                                 
                if (curDistanceToEnd > sumDistance / 2) {
                    v1 = startTarget.clone().multiplyScalar(1 - proportion).clone();
                    currentNode && currentNode.setOpacity(curDistanceToEnd / sumDistance);
                    node.setCoverOpacity(curDistanceToStart / sumDistance);

                } else {
                    v1 = newTarget.clone().multiplyScalar(1 - proportion).clone();
                    currentNode && currentNode.setOpacity(0);
                    node.setOpacity(1);
                    node.setCoverOpacity(0);
                }
                // if(curDistanceToEnd < curNodeLength/2){
                //     currentNode && currentNode.setOpacity(1 - curDistanceToStart / sumDistance);
                // }
                v2 = oldTarget.clone().multiplyScalar(proportion).clone();
                curTarget = v1.add(v2);
                curCamera = curTarget.clone().add(directionVector);
                let { x, y, z } = curTarget;
                scope.controls.target.set(x, y, z);
                coverPosition = new THREE.Vector3(x, y, z).add(addVector);
                node.setCoverPosition(coverPosition);
                scope.camera.position.set(curCamera.x, curCamera.y, curCamera.z);
            });
            tween.onComplete(function () {
                scope.currentNode = node;
                // scope.updateButtons();
                scope.showAllButton();
                scope.moveDoneCallback  && scope.moveDoneCallback();
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
                div.classList.add('switch');
                div.style.display = 'none';
                self.dom.appendChild(div);
                v.buttonDom = div;

                var icon = document.createElement('span');
                icon.classList.add('panorama-move-icon');

                var text = document.createElement('span');
                text.classList.add('panorama-move-txt');
                text.textContent = '场景' + (i + 1);

                div.appendChild(icon);
                div.appendChild(text);
                (function () {
                    v.buttonDom.addEventListener('click', function (ev) {
                        self.showNode(v);
                        typeof self.buttonCallback == 'function' && self.buttonCallback(i);
                    }, false)
                })(v, i);

            });
        }
        updateButtonText(arr){
            this.children.forEach(function(v,i){
                var $text = v.buttonDom.querySelector('.panorama-move-txt');
                $text.textContent = arr[i];
            })
        }
        addRotateCallback() {
            var self = this;
            this.controls.callbackFunctions.onRotate = function (ev) {
                self.updateButtons();
            };
        }
        hideAllButton() {
            this.children.forEach(function (item) {
                var button = item.buttonDom;
                button.style.visibility = 'hidden';
            });
        }
        showAllButton() {
            this.children.forEach(function (item) {
                var button = item.buttonDom;
                button.style.visibility = 'visible';
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
                    button.style.display = 'flex';
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
            var result = {
                x: Math.round(vector.x * HalfBrowseWidth + HalfBrowseWidth),
                y: Math.round(vector.y * HalfBrowseHeight + HalfBrowseHeight),
                isFront: vector.z < 1
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

            this.geo = null;
            this.mesh = null;
        }
        init() {
            var container = this.dom;
            this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(this.dom.offsetWidth, this.dom.offsetHeight);
            this.renderer.setClearColor(0xeeeeee, 0);
            container.appendChild(this.renderer.domElement);

            this.scene = new THREE.Scene();

            this.camera = new THREE.PerspectiveCamera(75, this.dom.offsetWidth / this.dom.offsetHeight, 0.1, 1000);
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.target.x = 0.01;
            Object.assign(this.controls, {
                enableZoom: false,
                enablePan: false,
                enableDamping: true,
                rotateSpeed: -0.25,
                autoRotateSpeed: 0.25
            });
            window.addEventListener('resize', this.onWindowResize, false);

            this.onDocumentMouseWheel = this.onDocumentMouseWheel.bind(this);
            document.addEventListener('wheel', this.onDocumentMouseWheel, false);
        }
        show(imgurl) {
            if (this.renderer.domElement.style.display == 'none') {
                this.renderer.domElement.style.display = 'block';
            }
            this.reset();

            if (this.geo === null) {
                var len = 10;
                this.geo = new THREE.CubeGeometry(len, len, len);
            }

            var textures = this.Node.prototype.getTexturesFromAtlasFile(imgurl, 6);
            var materials = [];
            for (var i = 0; i < 6; i++) {
                var material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.FrontSide, depthWrite: true, map: textures[i] });
                materials.push(material);
            }

            if (this.mesh == null) {
                this.mesh = new THREE.Mesh(this.geo, materials);
                this.mesh.geometry.scale(1, 1, -1);
                this.mesh.position.copy(new THREE.Vector3(0, 0, 0));
            } else {
                this.mesh.material = materials;
            }

            this.scene.add(this.mesh);
            this.mesh.visible = true;
            this.mesh.material.forEach(material => {
                material.opacity = 1;
            })
        }
        reset(){
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            };
            this.camera.fov = 75;
            this.camera.updateProjectionMatrix();
            this.camera.position.set(0, 0, 0);
            this.controls.target.set(0, 0, 0.01);
        }
        onDocumentMouseWheel(event) {
            var fov = this.camera.fov + event.deltaY * 0.05;
            this.camera.fov = THREE.Math.clamp(fov, 45, 75);
            this.camera.updateProjectionMatrix();
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
        hide() {
            if (this.renderer.domElement.style.display = 'none') {
                return;
            }
            this.renderer.domElement.style.display = 'none';
        }
        dispose() {
            this.controls.dispose();
            this.renderer.domElement.remove();
            this.renderer.domElement = null;
            this.renderer = null;
            this.camera = null;
            this.nodeManager.children.forEach(function (v) {
                v.buttonDom && v.buttonDom.remove();
            });
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
            window.removeEventListener('resize', this.onWindowResize);
            document.removeEventListener('wheel', this.onDocumentMouseWheel);
            cancelAnimationFrame(this.animateId);
        }
    };



})();