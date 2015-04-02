describe('Modal', function () {
    beforeEach(function () {
        var testModule = angular.module('test.fgModal', ['fgModal']);
        testModule.config(function (ModalProvider) {
            ModalProvider.modal('test', {
                template: '<div/>'
            });
        });
        inject(module)
    });

    var $service;

    beforeEach(inject(function (_Modal_) {
        Modal = _Modal_;
    }));

    it('tests that promises are processed concurrently', function (next) {

    });
});
