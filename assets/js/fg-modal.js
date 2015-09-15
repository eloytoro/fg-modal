angular.module('fg.modal', ['ngAnimate'])

.provider('Modal', function () {
    var ModalTemplate = function (name, config) {
        this.templateUrl = config.templateUrl;
        this.template = config.template;
        this.defaults = config.defaults || {};
        this.controller = config.controller;
        this.controllerAs = config.controllerAs;
        this.class = config.class;
        this.resolve = config.resolve || {};
        this.name = name;
    };

    var storage = {};

    var provider = this;

    this.modal = function (name, invokable) {
        storage[name] = function (injector) {
            var results = injector.invoke(invokable);
            return new ModalTemplate(name, results);
        };
        return provider;
    };

    this.loadingTemplateUrl = null;
    this.loadingMask = true;

    this.$get = function ($document, $compile, $rootScope, $http, $templateCache, $q, $animate, $injector, $controller) {

        // Set all configurations
        Object.keys(storage).forEach(function (key) {
            storage[key] = storage[key]($injector);
        });

        var $scope = $rootScope.$new(),
            $element,
            activeModals = [];

        $scope.loadingTemplateUrl = provider.loadingTemplateUrl;

        function Modal (template) {
            var _this = this,
                deferred = {
                    accept: $q.defer(),
                    dismiss: $q.defer(),
                    destroy: $q.defer()
                },
                callbacks = {
                    link: [], overlay: [], conceal: [],
                    accept: [], dismiss: [], destroy: []
                },
                resolve = function (prop) {
                    return $q.all(callbacks[prop].map(function (cb) {
                        return $q.when(cb());
                    })).then(function () {
                        deferred[prop].resolve();
                        return deferred[prop].promise;
                    });
                },
                call = function (prop) {
                    callbacks[prop].forEach(function (cb) {
                        cb();
                    });
                };

            this.$template = template;
            this.$index = 0;

            this.accept = function () {
                return resolve('accept')
                    .then(_this.destroy);
            };

            this.dismiss = function () {
                return resolve('dismiss')
                    .then(_this.destroy);
            };

            this.destroy = function () {
                return resolve('destroy')
                    .then(function () {
                        var index = activeModals.indexOf(_this);
                        activeModals.splice(index, 1);
                        _this.$element.remove();

                        activeModals.forEach(function (modal) {
                            if (modal.$index > _this.$index) modal.overlay();
                        });

                        $scope.show = activeModals.length;

                        _this.$scope.$destroy();
                    });
            };

            this.when = function (e) {
                return deferred[e].promise;
            };

            this.overlay = function () {
                if (_this.$index === 0) return;
                _this.$element.css('z-index', '+=1');
                _this.$index--;
                call('overlay');
            };

            this.conceal = function () {
                _this.$element.css('z-index', '-=1');
                _this.$index++;
                call('conceal');
            };

            this.on = function (e, cb) {
                e.split(' ').forEach(function (e) {
                    callbacks[e].push(cb.bind(_this));
                });
                return _this;
            };

            this.$$trigger = call;
        };

        var $element = $compile(angular.element([
            '<div class="fg-modal-wrapper fg-modal-dropzone ng-hide" ng-show="show">',
                '<div ng-show="loading" ng-include="loadingTemplateUrl"></div>',
            '</div>'
        ].join('')))($scope);

        $document.find('body').append($element);

        $element.on('mouseup', function (e) {
            if (angular.element(e.target).hasClass('fg-modal-dropzone')) {
                var first = factory.list()[0];
                if (first) first.dismiss();
            }
        });

        ModalTemplate.prototype.pop = function (scope) {
            var modal = new Modal(this);

            scope = scope || {};

            if (!scope.$id) {
                scope = Object.keys(scope).reduce(function (acc, key) {
                    acc[key] = scope[key];
                    return acc;
                }, $scope.$new());
            } else {
                scope = scope.$new();
            }

            scope.$modal = modal;

            var _this = this;

            $scope.loading = !$scope.show && provider.loadingMask;
            $scope.show = $scope.show || provider.loadingMask;

            $q.all({
                locals: $q.all(Object.keys(this.resolve).reduce(function (acc, key) {
                    acc[key] = $q.when($injector.invoke(_this.resolve[key]));
                    return acc;
                }, {
                    $scope: scope,
                    $modal: modal
                })),
                template: $q.when(this.template || $http({
                    method: 'GET',
                    cache: $templateCache,
                    url: this.templateUrl,
                    type: 'text/html'
                }))
            }).then(function (results) {
                var clone = angular.element(results.template.data)
                    .addClass('fg-modal');
                if (_this.class)
                    clone.addClass(_this.class);
                var ctrl;
                clone = $compile(clone)(scope);
                modal.$scope = scope;
                if (_this.controller)
                    ctrl = $controller(_this.controller, results.locals);
                $scope.loading = false;
                $scope.show = true;
                if (_this.controllerAs)
                    scope[_this.controllerAs] = ctrl;
                $element.append(clone);
                modal.$element = clone;
                activeModals.forEach(function (item) {
                    item.conceal();
                });
                activeModals.unshift(modal);
                modal.$$trigger('link');
            });

            Object.keys(this.defaults).forEach(function (key) {
                var setting = _this.defaults[key];
                (setting instanceof Array ? setting : [setting])
                    .forEach(function (callback) {
                        modal.on(key, callback);
                    });
            });

            return modal;
        };

        var factory = function (name) {
            if (!name) return activeModals[0];
            return storage[name];
        };

        factory.list = function () {
            return activeModals.sort(function (a, b) {
                return a.$index > b.$index;
            });
        };

        return factory;
    };
});
