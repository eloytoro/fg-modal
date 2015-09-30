angular.module('fg.modal', ['ngAnimate'])

.factory('ModalTemplate', ["$document", "$compile", "$rootScope", "$http", "$templateCache", "$q", "$animate", "$injector", "$controller", function(
  $document,
  $compile,
  $rootScope,
  $http,
  $templateCache,
  $q,
  $animate,
  $injector,
  $controller) {

  var loadingTemplateUrl = null;
  var loadingMask = true;

  var $scope = $rootScope.$new(),
    activeModals = [];

  $scope.loadingTemplateUrl = loadingTemplateUrl;

  var $wrapper = $compile(angular.element([
    '<div class="fg-modal-wrapper fg-modal-dropzone ng-hide" ng-show="show">',
    '<div ng-show="loading" ng-include="loadingTemplateUrl"></div>',
    '</div>'
  ].join('')))($scope);

  function ModalTemplate(options) {
    this.templateUrl = options.templateUrl;
    this.template = options.template;
    this.containerUrl = options.containerUrl;
    this.defaults = options.defaults || {};
    this.controller = options.controller;
    this.controllerAs = options.controllerAs;
    this.class = options.class;
    this.resolve = options.resolve || {};
  };

  function Modal() {
    var self = this;

    this.$$deferredEvents = {
      accept: $q.defer(),
      dismiss: $q.defer(),
      destroy: $q.defer()
    };

    this.$$eventListeners = {
      link: [],
      accept: [],
      dismiss: [],
      destroy: []
    };

    this.$$pendingEvents = [];

  };

  Modal.prototype.$$trigger = function(prop) {
    this.$$eventListeners[prop].forEach(function(cb) {
      cb();
    });
  };

  Modal.prototype.$$resolve = function(prop) {
    var self = this;
    var deferred = self.$$deferredEvents[prop];
    if (this.$$pendingEvents.indexOf(prop) > -1)
      return deferred.promise;
    this.$$pendingEvents.push(prop);
    var listeners = self.$$eventListeners[prop];
    var tasks = listeners.map(function(cb) {
      return $q.when(cb());
    });
    return $q.all(tasks)
      .then(function() {
        deferred.resolve();
        return deferred.promise;
      }, function(err) {
        var index = self.$$pendingEvents.indexOf(prop);
        self.$$pendingEvents.splice(index, 1);
        return $q.reject(err);
      });
  };

  Modal.prototype.accept = function() {
    this.$$resolve('accept')
      .then(this.destroy.bind(this))
  };

  Modal.prototype.dismiss = function() {
    return this.$$resolve('dismiss')
      .then(this.destroy.bind(this));
  };

  var animateLeave = function() {
    return $animate.leave(this.$element);
  };

  var destroyModal = function() {
    var self = this;
    var index = _.findIndex(activeModals, function(modal) {
      return modal.$scope.$$id === self.$scope.$$id;
    });

    activeModals.splice(index, 1);

    $scope.show = activeModals.length;

    self.$scope.$destroy();
  };

  var rejectUnresolvedEvents = function() {
    var deferredEvents = this.$$deferredEvents;
    deferredEvents.accept.reject();
    deferredEvents.dismiss.reject();
  };

  Modal.prototype.destroy = function() {
    var self = this;
    return this.$$resolve('destroy')
      .then(animateLeave.bind(this))
      .then(destroyModal.bind(this))
      .then(rejectUnresolvedEvents.bind(this))
      .then(this.$$deferredEvents.destroy.resolve);
  };

  Modal.prototype.when = function(e) {
    return this.$$deferredEvents[e].promise;
  };

  Modal.prototype.on = function(e, cb) {
    if (Array.isArray(cb)) return cb.forEach(this.on.bind(this, e));
    var self = this;
    e.split(' ').forEach(function(e) {
      self.$$eventListeners[e].push(cb.bind(self));
    });
    return self;
  };

  $document.find('body').append($wrapper);

  $wrapper.on('mouseup', function(e) {
    if (angular.element(e.target).hasClass('fg-modal-dropzone')) {
      activeModals.forEach(function(modal) {
        modal.dismiss();
      });
    }
  });

  ModalTemplate.prototype.render = function(scope) {
    var modal = new Modal();
    var self = this;
    var hasContainer = self.containerUrl;

    scope = scope || {};

    if (scope.constructor !== $rootScope.constructor) {
      scope = angular.extend($scope.$new(), scope);
    } else {
      scope = scope.$new();
    }

    scope.$modal = modal;

    $scope.loading = !$scope.show && loadingMask;
    $scope.show = $scope.show || loadingMask;

    var tasks = {
      locals: $q.all(Object.keys(self.resolve).reduce(function(acc, key) {
        acc[key] = $q.when($injector.invoke(self.resolve[key]));
        return acc;
      }, {
        $scope: scope,
        $modal: modal
      })),
      template: $q.when(self.template || $http({
        method: 'GET',
        cache: $templateCache,
        url: self.templateUrl,
        type: 'text/html'
      }))
    };

    if (hasContainer) {
      tasks.container = $q.when(self.container || $http({
        method: 'GET',
        cache: $templateCache,
        url: self.containerUrl,
        type: 'text/html'
      }))
    }

    $q.all(tasks).then(function(results) {
      var htmlToElement = function(data) {
        return angular.element(data).addClass('fg-modal');
      };

      var clone = hasContainer ?
        htmlToElement(results.container.data) :
        htmlToElement(results.template.data);

      var ctrl;
      var transcludeOpts = hasContainer && {
        parentBoundTranscludeFn: function(noopScope, cloneLinkingFn) {
          $compile(results.template.data)(scope, cloneLinkingFn);
        }
      };

      var transcludeFn = function(clone, element) {
        modal.$scope = scope;
        if (self.controller)
          ctrl = $controller(self.controller, results.locals);
        $scope.loading = false;
        $scope.show = true;
        if (self.controllerAs)
          scope[self.controllerAs] = ctrl;
        var last = _.last(activeModals);
        $animate.enter(clone, $wrapper, last && last.$element);
        modal.$element = clone;
        activeModals.unshift(modal);
        modal.$$trigger('link');
      };

      $compile(clone)(scope, transcludeFn, transcludeOpts);
    });

    Object.keys(self.defaults).forEach(function(key) {
      var actions = self.defaults[key];
      if (!actions) return;
      (Array.isArray(actions) ? actions : [actions])
      .forEach(function(callback) {
        modal.on(key, callback);
      });
    });

    return modal;
  };

  return ModalTemplate;
}]);
