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

  var $scope = $rootScope.$new();
  var activeModals = [];

  var MODAL_WRAPPER_TEMPLATE = '<div class="fg-modal-wrapper fg-modal-dropzone ng-hide" ng-show="show" />';
  var MODAL_EVENTS = ['destroy', 'link', 'accept', 'dismiss'];

  var $wrapper = $compile(angular.element(MODAL_WRAPPER_TEMPLATE))($scope);

  var toArray = function(val) {
    return Array.isArray(val) ? val : [val];
  };

  function ModalTemplate(options) {
    this.templateUrl = options.templateUrl;
    this.template = options.template;
    this.containerUrl = options.containerUrl;
    this.controller = options.controller;
    this.controllerAs = options.controllerAs;
    this.resolve = options.resolve || {};
    this.defaults = _.mapValues(options.defaults || {}, toArray);
  };

  function Modal() {
    var self = this;

    this.$$deferredEvents = {};
    this.$$eventListeners = {};

    MODAL_EVENTS.forEach(function(prop) {
      self.$$deferredEvents[prop] = $q.defer();
      self.$$eventListeners[prop] = [];
    })

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

  ModalTemplate.prototype.inherit = function(options) {
    var template = new ModalTemplate(_.defaults(options, this));
    for (var key in this.defaults) {
      var events = toArray(this.defaults[key]);
      template.defaults[key] = key in options.defaults ?
        template.defaults[key].concat(events) :
        events;
    }
    return template;
  };

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

    $scope.show = $scope.show;

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
