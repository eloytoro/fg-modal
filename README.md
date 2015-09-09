# fgModal

4Geeks' implementation of an angular modal

## Why fgModal?

There are many other libraries that achieve somewhat the same _basic_ feats fgModal does, but you'll find that using fgModal is far more intuitive and modular than any other library out there.

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

fgModal is fully capable of recreating the same logic (using a different API) but instead of defining modals and their settings within controllers you'll be defining them using a `provider`

## Provider

`ModalProvider.modal(name, options)` - defines a new modal in your app, the `options` are
* `templateUrl | template` - The `ModalTemplate`'s html template. **Note:** you can refer to the modal's instance using `$modal` inside angular expressions within the html
* `controller` - Controller with logic, injects `$scope`, `$element` and `$modal`
* `controllerAs` - Alias for the controller within the scope
* `defaults` - List of pre-defined events that will be applied to every `Modal` instance once they're created. (optional)
* `resolve` - Very much like any other resolve is an object that resolves the given key values to the value the promise they reference to. The modal won't link until every resolve is fullfiled. (optional)
* `class` - A css class that will be added to the modal once its linked (optional)

`ModalProvider.loadingTemplateUrl` - If defined then it will load the default template while the modal is being loaded. Its defined within the `$rootScope`

`ModalProvider.loadingMask` - If true it will show the mask above the webpage while the modal is loading, preventing the user from interacting with anything else while it loads. (defaults to true)

## Service

`Modal(name)` - Returns the `ModalTemplate` that goes by the given name.

`Modal.list` - Returns an array of all existing modals sorted by their priority.

## ModalTemplate

`ModalTemplate.pop(scope)` - Instantiates a new modal, the scope parameter will be copied to the modal's internal scope, it can be either a scope or an object.

## Modal

`Modal.accept()` - Closes the modal triggering the `accept` event.

`Modal.dismiss()` - Closes the modal triggering the `dismiss` event.

`Modal.destroy()` - Destroys the modal triggering the `destroy` event.

`Modal.conceal()` - Lowers the modal's priority, sending it back (and lowers it's z-index by 1).

`Modal.overlay()` - Increases the modal's priority, bringing it forward (and increases it's z-index by 1).

`Modal.on(event, callback)` - Queues a listener into the modal's event callback list. There are currently 6 events that can be hooked to
* `accept`
* `dismiss`
* `destroy`
* `conceal`
* `overlay`
* `link`

Callbacks hooked to the `accept`, `dismiss` and `destroy` events can return promises, which could delay or cancel the event completion (events are fired before the action is resolved). These promises **do not** block the callback process. `overlay`, `conceal` or `link` cannot be delayed or canceled this way.

You can pass many event names to the same callback.

`Modal.when(event)` - Returns a promise that resolves when all of the event's callbacks are finished (or after all promises hooked to the event are resolved), only works for `accept`, `dismiss` or `destroy`

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
ModalProvider.modal('newPoll', function () {
    return {
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
    };
});

// controller instantiation
Modal('newPoll')
    .pop({
        selectedTemplate: 'defaultTemplate'
    })
    .on('dismiss', function () {
        return $timeout(1000) // waits a second before closing the modal
    });
```
