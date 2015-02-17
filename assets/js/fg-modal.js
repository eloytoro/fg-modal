angular.module('fgModal', ['ngAnimate'])

.provider('Modal', function () {
    var ModalTemplate = function (name, config) {
        this.templateUrl = config.templateUrl;
        this.template = config.template;
        this.defaults = config.defaults;
        this.controller = config.controller;
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

    this.$get = function ($document, $compile, $rootScope, $http, $templateCache, $q, $animate, $injector, $controller) {

        // Set all configurations
        Object.keys(storage).forEach(function (key) {
            storage[key] = storage[key]($injector);
        });

        var $scope = $rootScope.$new(),
            $element,
            activeModals = [];

        var Modal = function (template) {
            var _this = this,
                deferred = {};

            var callbacks = {
                when: function (prop) {
                    return $q.all(callbacks[prop].map(function (cb) {
                        return $q.when(cb());
                    })).then(function () {
                        deferred[prop].resolve();
                        return deferred[prop].promise;
                    });
                },
                call: function (prop) {
                    callbacks[prop].forEach(function (cb) {
                        cb();
                    });
                }
            };

            'accept dismiss link overlay conceal destroy'
                .split(' ')
                .forEach(function (e) {
                    callbacks[e] = [];
                    deferred[e] = $q.defer();
                });

            this.$template = template;
            this.$index = 0;

            this.accept = function () {
                return callbacks.when('accept')
                    .then(_this.destroy);
            };

            this.dismiss = function () {
                return callbacks.when('dismiss')
                    .then(_this.destroy);
            };

            this.destroy = function () {
                return callbacks.when('destroy')
                    .then(function () {
                        var index = activeModals.indexOf(_this);
                        activeModals.splice(index, 1);
                        _this.element.remove();

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

            this.link = function (scope, element) {
                _this.element = element;
                _this.$scope = scope;
                $controller(template.controller, {
                    $scope: scope
                });
                $element.append(element);
                _this.element.css('z-index', 10000);
                activeModals.forEach(function (modal) {
                    modal.conceal();
                });
                activeModals.unshift(_this);
                $scope.show = true;
                callbacks.call('link');
            };

            this.overlay = function () {
                if (_this.$index === 0) return;
                _this.element.css('z-index', '+=1');
                _this.$index--;
                callbacks.call('overlay');
            };

            this.conceal = function () {
                _this.element.css('z-index', '-=1');
                _this.$index++;
                callbacks.call('conceal');
            };

            this.on = function (e, cb) {
                e.split(' ').forEach(function (e) {
                    callbacks[e].push(cb.bind(_this));
                });
                return _this;
            };
        };

        $compile(angular.element(
            '<div class="fg-modal-wrapper ng-hide" ng-show="show"></div>'
        ))($scope, function (clone) {
            $element = clone;
            $document.find('body').append($element);
        });

        ModalTemplate.prototype.pop = function (scope) {
            var modal = new Modal(this);

            scope = scope || {};

            if (scope.constructor.name !== 'Scope') {
                var tempScope = $rootScope.$new();
                for (var key in scope) {
                    tempScope[key] = scope[key];
                }
                scope = tempScope;
            } else {
                scope = scope.$new();
            }

            scope.$modal = modal;

            var _this = this;

            var link = function (element) {
                $compile(element)(scope, function (element) {
                    modal.link(scope, element);
                });
            };

            if (this.templateUrl) {
                $http({
                    method: 'GET',
                    cache: $templateCache,
                    url: this.templateUrl,
                    type: 'text/html'
                }).success(link);
            } else {
                link(this.template);
            }

            if (this.defaults) {
                Object.keys(this.defaults).forEach(function (key) {
                    if (_this.defaults[key] instanceof Array) {
                        _this.defaults[key].forEach(function (action) {
                            modal.on(key, action);
                        });
                    } else {
                        modal.on(key, _this.defaults[key]);
                    }
                });
            }

            return modal;
        };

        var factory = function (name) {
            if (!name) return activeModals[0];
            return storage[name];
        };

        factory.list = function (index) {
            return activeModals.sort(function (a, b) {
                return a.$index > b.$index;
            });
        };

        return factory;
    };
});
