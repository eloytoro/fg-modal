# fg.modal

4Geeks' implementation of an angular modal

## Why not other?

There are many other libraries that achieve somewhat the same _basic_ feats fg.modal does, but you'll find that using fg.modal is far more intuitive and modular than any other library out there.

AngularUI provides a set of **great** tools, I cannot stress that enough, however their modal implementation has (in my opinion) some fundamental flaws that led me create my own.

Take for example their demo (taken from their [docs](https://angular-ui.github.io/bootstrap/))
```javascript
var modalInstance = $modal.open({
  templateUrl: 'myModalContent.html',
  controller: 'ModalInstanceCtrl',
  size: size,
  resolve: {
    items: function () {
      return $scope.items;
    }
  }
});

modalInstance.result.then(function (selectedItem) {
  $scope.selected = selectedItem;
}, function () {
  $log.info('Modal dismissed at: ' + new Date());
});
```
Note that this logic is defined within the view's controller, that means that this modal is unique for this view, the whole idea that there are many modals alike across the application is discarded and in my experience thats what happens.

fg.modal is fully capable of recreating the same logic (using a different API) but instead of defining modals and their settings within controllers you'll be defining them using your own `service`

## ModalTemplate service

`new ModalTemplate(options)` - defines a new modal template
* `options.templateUrl | template` - The `ModalTemplate`'s html template. **Note:** you can refer to the modal's instance using `$modal` inside angular expressions within the html
* `options.controller` - Controller with logic, injects `$scope`, `$element` and `$modal`
* `options.controllerAs` - Alias for the controller within the scope
* `options.defaults` - List of pre-defined events that will be applied to every `Modal` instance once they're created. (optional)
* `options.resolve` - Very much like any other resolve is an object that resolves the given key values to the value the promise they reference to. The modal won't link until every resolve is fullfiled. (optional)
* `options.containerUrl | container` - A wrapper for yor template, if defined it compiles the taken html and expects a `ng-transclude` directive defined within to transclude the template contents inside the tag.

## ModalTemplate object

`ModalTemplate#render(scope)` - Instantiates a new modal, the scope parameter will be copied to the modal's internal scope, it can be either a scope or an object.

`ModalTemplate#inherit(options)` - Creates a new template that inherits all the properties overwritting only the given options, **defaults are not overwritten by this, they are added to the already defined ones**

## Modal object

`Modal#accept()` - Closes the modal triggering the `accept` event.

`Modal#dismiss()` - Closes the modal triggering the `dismiss` event.

`Modal#destroy()` - Destroys the modal triggering the `destroy` event.

`Modal#on(event, callback)` - Queues a listener into the modal's event callback list. There are currently 6 events that can be hooked to
* `accept`
* `dismiss`
* `destroy`
* `link`

Callbacks hooked to the `accept`, `dismiss` and `destroy` events can return promises, which could delay or cancel the event completion (events are fired before the action is resolved). These promises **do not** block the callback process. `overlay`, `conceal` or `link` cannot be delayed or canceled this way.

You can pass many event names to the same callback.

`Modal#when(event)` - Returns a promise that resolves when all of the event's callbacks are finished (or after all promises hooked to the event are resolved), only works for `accept`, `dismiss` or `destroy`

## #Additional self-explanatory properties
* `Modal.$scope`
* `Modal.$element`
* `Modal.$template`

## SCSS

Theres a set of built-in css classes.

`.fg-modal-wrapper` - Fixed container parent for all modals.

`.fg-modal` - Appended to every modal created, its `z-index` starts at 10000

`.fg-modal-(lg|md|sm)` - Some default modal sizes

`.fg-modal-dropzone` - Add this class to any container and when clicked it will dismiss the current modal


## Example
```javascript
// config definition
var newPollTemplate = new ModalTemplate({
  templateUrl: 'views/modals/new-poll.html',
  controller: /*@ngInject*/ function ($scope, $modal, PollResource, $state) {
    $scope.create = function () {
      if ($scope.selectedTemplate) {
        $scope.disabled = true;
        PollResource.clone(function () {
          $state.go('user.polls.edit');
          $modal.dismiss();
        });
      } else {
        $state.go('user.polls.edit');
        $modal.dismiss();
      }
    };
  }
});

// controller instantiation
newPollTemplate
  .render({
    selectedTemplate: 'defaultTemplate'
  })
  .on('dismiss', function () {
    return $timeout(1000) // waits a second before closing the modal
  });
```
