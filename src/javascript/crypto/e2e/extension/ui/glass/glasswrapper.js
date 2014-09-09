/**
 * @license
 * Copyright 2014 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Wrapper for the looking glass. Adds install and remove methods.
 */

goog.provide('e2e.ext.ui.ComposeGlassWrapper');
goog.provide('e2e.ext.ui.GlassWrapper');

goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.crypt.base64');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.style');

// Read glass
goog.scope(function() {
var ui = e2e.ext.ui;



/**
 * Constructor for the looking glass wrapper.
 * @param {Element} targetElem The element that will host the looking glass.
 * @param {string=} text Optional alternative text to the innerText.
 * @param {mode=} mode Scroll or resize mode. Default is scroll.
 * @param {string=} selector Optional selector for host element.
 * @constructor
 * @extends {goog.Disposable}
 */
ui.GlassWrapper = function(targetElem, text, mode, selector) {
  goog.base(this);

  /**
   * The element that will host the looking glass.
   * @type {Element}
   * @private
   */
  this.targetElem_ = targetElem;
  this.targetElem_.setAttribute('original_content', text ? text :
                                this.targetElem_.innerText);
  this.text_ = text;
  this.mode = mode || 'scroll';
  this.selector = selector;

  /**
   * The original children of the target element.
   * @type {!Array.<Node>}
   * @private
   */
  this.targetElemChildren_ = [];
};
goog.inherits(ui.GlassWrapper, goog.Disposable);


/** @override */
ui.GlassWrapper.prototype.disposeInternal = function() {
  this.removeGlass();

  goog.base(this, 'disposeInternal');
};


/**
 * Installs the looking glass into the hosting page.
 */
ui.GlassWrapper.prototype.installGlass = function() {
  this.targetElem_.lookingGlass = this;
  goog.array.extend(this.targetElemChildren_, this.targetElem_.childNodes);

  var glassFrame = goog.dom.createElement(goog.dom.TagName.IFRAME);
  glassFrame.src = chrome.runtime.getURL('glass.html');
  glassFrame.scrolling = 'no';
  goog.style.setSize(glassFrame, goog.style.getSize(this.targetElem_));
  glassFrame.style.border = 0;

  var pgpMessage = this.text_ ? this.text_ : this.targetElem_.innerText;
  this.targetElem_.textContent = '';
  // TODO(radi): Render in a shadow DOM.
  this.targetElem_.appendChild(glassFrame);

  glassFrame.addEventListener('load', goog.bind(function() {
    glassFrame.contentWindow.postMessage(JSON.stringify({
      string: goog.crypt.base64.encodeString(pgpMessage, true),
      origin: window.location.origin,
      mode: this.mode,
      selector: this.selector
    }), chrome.runtime.getURL(''));
  }, this), false);

  if (this.mode === 'scroll') {
    glassFrame.addEventListener('mousewheel', function(evt) {
      evt.stopPropagation();
      evt.preventDefault();
    });
  }
};


/**
 * Removes the looking glass from the hosting page.
 */
ui.GlassWrapper.prototype.removeGlass = function() {
  this.targetElem_.lookingGlass = undefined;
  this.targetElem_.textContent = '';
  goog.array.forEach(this.targetElemChildren_, function(child) {
    this.targetElem_.appendChild(child);
  }, this);

  this.targetElemChildren_ = [];
};


/**
 * Returns the original content of the target element where the looking glass is
 * installed.
 * @return {string} The original content.
 */
ui.GlassWrapper.prototype.getOriginalContent = function() {
  return this.targetElem_.getAttribute('original_content');
};

});  // goog.scope


// Compose glass. Unlike read glass, does not preserve children.

goog.scope(function() {
  var ui = e2e.ext.ui;

  /**
   * Constructor for the compose glass wrapper.
   * @param {Element} targetElem Element that hosts the looking glass.
   * @param {Object} draft Draft data
   * @param {mode=} mode Scroll or resize mode.
   * @param {string=} hash Hash to uniquely identify this wrapper
   * @constructor
   * @extends {goog.Disposable}
   */
  ui.ComposeGlassWrapper = function(targetElem, draft, mode, hash) {
    goog.base(this);

    this.targetElem_ = targetElem;
    this.draft = draft;
    this.targetElem_.setAttribute('original_content', this.body);
    this.mode = mode || 'scroll';
    this.hash = hash || '';
  };
  goog.inherits(ui.ComposeGlassWrapper, goog.Disposable);

  /** @override */
  ui.ComposeGlassWrapper.prototype.disposeInternal = function() {
    this.removeGlass();
    goog.base(this, 'disposeInternal');
  };

  /**
   * Installs compose glass
   */
  ui.ComposeGlassWrapper.prototype.installGlass = function() {
    this.targetElem_.composeGlass = this;
    goog.style.setElementShown(document.getElementById('theAd'), false);
    goog.style.setElementShown(document.getElementById('slot_mbrec'), false);

    var glassFrame = goog.dom.createElement(goog.dom.TagName.IFRAME);
    glassFrame.src = chrome.runtime.getURL('composeglass.html');
    var targetSize = goog.style.getSize(this.targetElem_);
    goog.style.setWidth(glassFrame, targetSize.width);
    // Make the frame fit a bit better?
    goog.style.setHeight(glassFrame, targetSize.height);
    glassFrame.style.border = 0;
    glassFrame.classList.add('e2eComposeGlass');

    // Hide the original compose window
    goog.array.forEach(this.targetElem_.children, function(elem) {
      if (elem.style.display != 'none') {
        elem.setAttribute('hidden_by_compose_glass', true);
        goog.style.setElementShown(elem, false);
      }
    });

    this.targetElem_.appendChild(glassFrame);
    this.glassFrame = glassFrame;

    glassFrame.addEventListener('load', goog.bind(function() {
      console.log('compose glassFrame loaded!', glassFrame.contentWindow);
      glassFrame.contentWindow.postMessage({
        draft: this.draft,
        mode: this.mode,
        hash: this.hash
      }, chrome.runtime.getURL(''));
    }, this), false);
  };

  /**
   * Removes compose glass
   */
  ui.ComposeGlassWrapper.prototype.removeGlass = function() {
    console.log('Removing composeGlassWrapper');
    goog.style.setElementShown(document.getElementById('theAd'), true);
    goog.style.setElementShown(document.getElementById('slot_mbrec'), true);

    this.targetElem_.composeGlass = undefined;
    if (this.glassFrame) {
      this.glassFrame.parentNode.removeChild(this.glassFrame);
    }
    goog.array.forEach(this.targetElem_.children, function(elem) {
      if (elem.getAttribute('hidden_by_compose_glass')) {
        goog.style.setElementShown(elem, true);
        elem.removeAttribute('hidden_by_compose_glass');
      }
    });
  };
});
