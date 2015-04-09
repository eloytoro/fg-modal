angular.module('fgModal', ['ngAnimate'])

.provider('Modal', function () {
    var ModalTemplate = function (name, config) {
        this.templateUrl = config.templateUrl;
        this.template = config.template;
        this.defaults = config.defaults || {};
        this.controller = config.controller;
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

    this.$get = ["$document", "$compile", "$rootScope", "$http", "$templateCache", "$q", "$animate", "$injector", "$controller", function ($document, $compile, $rootScope, $http, $templateCache, $q, $animate, $injector, $controller) {

        // Set all configurations
        Object.keys(storage).forEach(function (key) {
            storage[key] = storage[key]($injector);
        });

        var $scope = $rootScope.$new(),
            $element,
            activeModals = [];

        var Modal = function (template) {
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

            this.link = function (scope, element, locals) {
                _this.$element = element;
                _this.$scope = scope;
                if (template.controller) {
                    locals.$scope = scope;
                    locals.$modal = _this;
                    locals.$element = element;
                    $controller(template.controller, locals);
                }
                $element.append(element);
                _this.$element.css('z-index', 10000);
                activeModals.forEach(function (modal) {
                    modal.conceal();
                });
                activeModals.unshift(_this);
                $scope.show = true;
                call('link');
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

            if (!scope.$id) {
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

            var link = function (element, locals) {
                $compile(element)(scope, function (element) {
                    modal.link(scope, element, locals);
                });
            };

            $q.all({
                locals: $q.all(Object.keys(this.resolve).reduce(function (acc, key) {
                    acc[key] = $q.when($injector.invoke(_this.resolve[key]));
                    return acc;
                }, {})),
                template: $q.when(this.template || $http({
                    method: 'GET',
                    cache: $templateCache,
                    url: this.templateUrl,
                    type: 'text/html'
                }))
            }).then(function (results) {
                link(results.template.data, results.locals);
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
    }];
});