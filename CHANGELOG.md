## 0.3.0

* Modal service renamed to ModalTemplate
* Updated the service's API to a more OOP approach
* Removed `class` option, `conceal` and `overlay` events
* Overhauled the promise logic so every promise is either fulfilled or rejected, but never left pending
* ModalTemplate.pop(scope) -> ModalTemplate.render(scope)
* added containers with transclude directives
* added ModalTemplate.inherit

## 0.2.1

* Renamed to fg-modal

## 0.2.0

* Added the `class` option
* Added the `controllerAs` option
* Added the `.fg-modal-dropzone` class
* Cleaned up the old way of dismissing the modal when clicking outside the container
