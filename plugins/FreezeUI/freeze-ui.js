'use strict';
(function() {
    document.freezeUI = function() {
        var blocker = document.createElement('div');
        blocker.classList.add('freeze-ui');

        var argObj = (0 < arguments.length && typeof arguments[0] === 'object')
            ? arguments[0]
            : {};
        var target = document.body;

        blocker.setAttribute('data-text', argObj.text || 'Loading');
        blocker.style.position = 'fixed';
        target.appendChild(blocker);

        var _blockerInst = {
          args: argObj,
          blocker: blocker,
          unfreeze: function() {
            this.blocker.remove();
          }
        }

        return _blockerInst;
    };
/*
    document.UnFreezeUI = function() {
        var target = document.getElementById('freeze-ui');
        target && (target.classList.add('is-unfreezing'), setTimeout(function() {
            target && (target.classList.remove('is-unfreezing'), target.parentElement && target.parentElement.removeChild(blocker))
        }, 250));
    }
*/
})();
