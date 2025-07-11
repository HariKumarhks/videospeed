// changed here
// EXTENSION 1: No Tab
var allowNewTab = 0;

// chrome.browserAction.setIcon({ path: "green32.png" });

chrome?.tabs?.onCreated?.addListener(function (tab) {
  // if (allowNewTab == 1) {
  //   chrome.tabs.remove(tab.id);
  // }

  allowNewTab & chrome.tabs.remove(tab.id);
});

// chrome.browserAction.onClicked.addListener(toggleNewtab);

function toggleNewtab() {
  allowNewTab ^= 1;
  // chrome.browserAction.setIcon({
  //   path: ["red32.png", "green32.png"][allowNewTab]
  // });
}

// -*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*

// EXTENSION 2: My Speed Controller
var regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;
var regEndsWithFlags = /\/(?!.*(.).*\1)[gimsuy]*$/;

// changed here
const WEBSITES_NAME = location.hostname.split(".")[1];

var tc = {
  settings: {
    lastSpeed: 1.0, // default 1x
    enabled: true, // default enabled
    speeds: {}, // empty object to hold speed for each source

    displayKeyCode: 86, // default: V
    rememberSpeed: false, // default: false
    forceLastSavedSpeed: false, //default: false
    audioBoolean: false, // default: false
    startHidden: false, // default: false
    controllerOpacity: 0.3, // default: 0.3
    keyBindings: [],
    blacklist: ``.replace(regStrip, ""),
    // blacklist: `\
    //   www.instagram.com
    //   twitter.com
    //   vine.com
    //   imgur.com
    //   teams.microsoft.com
    // `.replace(regStrip, ""),
    defaultLogLevel: 4,
    logLevel: 3
  },

  // Holds a reference to all of the AUDIO/VIDEO DOM elements we've attached to
  mediaElements: []
};

// console.log(tc);

/* Log levels (depends on caller specifying the correct level)
  1 - none
  2 - error
  3 - warning
  4 - info
  5 - debug
  6 - debug high verbosity + stack trace on each message
*/
function log(message, level) {
  verbosity = tc.settings.logLevel;
  if (typeof level === "undefined") {
    level = tc.settings.defaultLogLevel;
  }
  if (verbosity >= level) {
    if (level === 2) {
      console.log("ERROR:" + message);
    } else if (level === 3) {
      console.log("WARNING:" + message);
    } else if (level === 4) {
      console.log("INFO:" + message);
    } else if (level === 5) {
      console.log("DEBUG:" + message);
    } else if (level === 6) {
      console.log("DEBUG (VERBOSE):" + message);
      console.trace();
    }
  }
}

chrome.storage.sync.get(tc.settings, function (storage) {
  tc.settings.keyBindings = storage.keyBindings; // Array
  if (storage.keyBindings.length == 0) {
    console.log("WEBSITES_NAME");
    console.log(WEBSITES_NAME);
    // Refer Keyboard Codes Here:
    //      https://asawicki.info/nosense/doc/devices/keyboard/key_codes.html
    // if first initialization of 0.5.3
    // UPDATE
    tc.settings.keyBindings.push({
      action: "slower",
      key: Number(storage.slowerKeyCode) || 109,
      value: Number(storage.speedStep) || 0.5,
      force: false,
      predefined: true
    }); // default Num -
    tc.settings.keyBindings.push({
      action: "faster",
      key: Number(storage.fasterKeyCode) || 107,
      value: Number(storage.speedStep) || 0.5,
      force: false,
      predefined: true
    }); // default: Num +
    tc.settings.keyBindings.push({
      action: "faster",
      key: 220,
      value: Number(storage.speedStep) || 0.5,
      force: false,
      predefined: true
    }); // default: \   // This is for keypad without numberpad.
    tc.settings.keyBindings.push({
      action: "rewind",
      key: Number(storage.rewindKeyCode) || 37,
      value: Number(storage.rewindTime) || 5,
      force: false,
      predefined: true
    }); // default: Left
    tc.settings.keyBindings.push({
      action: "advance",
      key: Number(storage.advanceKeyCode) || 39,
      value: Number(storage.rewindTime) || 5,
      force: false,
      predefined: true
    }); // default: Right
    tc.settings.keyBindings.push({
      action: "reset",
      key: Number(storage.resetKeyCode) || 106,
      value: 1.0,
      force: false,
      predefined: true
    }); // default: Num *
    tc.settings.keyBindings.push({
      action: "reset",
      key: 187,
      value: 1.0,
      force: false,
      predefined: true
    }); // default: =   // This is for keypad without numberpad.
    tc.settings.keyBindings.push({
      action: "fast",
      key: Number(storage.fastKeyCode) || 110,
      value: Number(storage.fastSpeed) || 1,
      force: false,
      predefined: true
    }); // default: Num .
    // Default ends here

    tc.settings.version = "0.5.3";

    chrome.storage.sync.set({
      keyBindings: tc.settings.keyBindings,
      version: tc.settings.version,
      displayKeyCode: tc.settings.displayKeyCode,
      rememberSpeed: tc.settings.rememberSpeed,
      forceLastSavedSpeed: tc.settings.forceLastSavedSpeed,
      audioBoolean: tc.settings.audioBoolean,
      startHidden: tc.settings.startHidden,
      enabled: tc.settings.enabled,
      controllerOpacity: tc.settings.controllerOpacity,
      blacklist: tc.settings.blacklist.replace(regStrip, "")
    });
  }
  tc.settings.lastSpeed = Number(storage.lastSpeed);
  tc.settings.displayKeyCode = Number(storage.displayKeyCode);
  tc.settings.rememberSpeed = Boolean(storage.rememberSpeed);
  tc.settings.forceLastSavedSpeed = Boolean(storage.forceLastSavedSpeed);
  tc.settings.audioBoolean = Boolean(storage.audioBoolean);
  tc.settings.enabled = Boolean(storage.enabled);
  tc.settings.startHidden = Boolean(storage.startHidden);
  tc.settings.controllerOpacity = Number(storage.controllerOpacity);
  tc.settings.blacklist = String(storage.blacklist);

  // ensure that there is a "display" binding (for upgrades from versions that had it as a separate binding)
  if (
    tc.settings.keyBindings.filter((x) => x.action == "display").length == 0
  ) {
    tc.settings.keyBindings.push({
      action: "display",
      key: Number(storage.displayKeyCode) || 86,
      value: 0,
      force: false,
      predefined: true
    }); // default V
  }

  initializeWhenReady(document);
});

function getKeyBindings(action, what = "value") {
  try {
    // console.log(
    //   "getKeyBindings fn:: ",
    //   tc.settings.keyBindings.find((item) => item.action === action)
    // );
    return tc.settings.keyBindings.find((item) => item.action === action)[what];
  } catch (e) {
    return false;
  }
}

function setKeyBindings(action, value) {
  tc.settings.keyBindings.find((item) => item.action === action)["value"] =
    value;
}

function defineVideoController() {
  // Data structures
  // ---------------
  // videoController (JS object) instances:
  //   video = AUDIO/VIDEO DOM element
  //   parent = A/V DOM element's parentElement OR
  //            (A/V elements discovered from the Mutation Observer)
  //            A/V element's parentNode OR the node whose children changed.
  //   div = Controller's DOM element (which happens to be a DIV)
  //   speedIndicator = DOM element in the Controller of the speed indicator

  // added to AUDIO / VIDEO DOM elements
  //    vsc = reference to the videoController

  tc.videoController = function (target, parent) {
    if (target.vsc) {
      return target.vsc;
    }

    tc.mediaElements.push(target);

    this.video = target;
    this.parent = target.parentElement || parent;
    storedSpeed = tc.settings.speeds[target.currentSrc];
    if (!tc.settings.rememberSpeed) {
      if (!storedSpeed) {
        log(
          "Overwriting stored speed to 1.0 due to rememberSpeed being disabled",
          5
        );
        storedSpeed = 1.0;
      }
      setKeyBindings("reset", getKeyBindings("fast")); // resetSpeed = fastSpeed
    } else {
      log("Recalling stored speed due to rememberSpeed being enabled", 5);
      storedSpeed = tc.settings.lastSpeed;
    }

    log("Explicitly setting playbackRate to: " + storedSpeed, 5);
    target.playbackRate = storedSpeed;

    this.div = this.initializeControls();

    var mediaEventAction = function (event) {
      storedSpeed = tc.settings.speeds[event.target.currentSrc];
      if (!tc.settings.rememberSpeed) {
        if (!storedSpeed) {
          log("Overwriting stored speed to 1.0 (rememberSpeed not enabled)", 4);
          storedSpeed = 1.0;
        }
        // resetSpeed isn't really a reset, it's a toggle
        log("Setting reset keybinding to fast", 5);
        setKeyBindings("reset", getKeyBindings("fast")); // resetSpeed = fastSpeed
      } else {
        log(
          "Storing lastSpeed into tc.settings.speeds (rememberSpeed enabled)",
          5
        );
        storedSpeed = tc.settings.lastSpeed;
      }
      // TODO: Check if explicitly setting the playback rate to 1.0 is
      // necessary when rememberSpeed is disabled (this may accidentally
      // override a website's intentional initial speed setting interfering
      // with the site's default behavior)
      log("Explicitly setting playbackRate to: " + storedSpeed, 4);
      setSpeed(event.target, storedSpeed);
    };

    target.addEventListener(
      "play",
      (this.handlePlay = mediaEventAction.bind(this))
    );

    target.addEventListener(
      "seeked",
      (this.handleSeek = mediaEventAction.bind(this))
    );

    var observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "src" ||
            mutation.attributeName === "currentSrc")
        ) {
          log("mutation of A/V element", 5);
          var controller = this.div;
          if (!mutation.target.src && !mutation.target.currentSrc) {
            controller.classList.add("vsc-nosource");
          } else {
            controller.classList.remove("vsc-nosource");
          }
        }
      });
    });
    observer.observe(target, {
      attributeFilter: ["src", "currentSrc"]
    });
  };

  tc.videoController.prototype.remove = function () {
    this.div.remove();
    this.video.removeEventListener("play", this.handlePlay);
    this.video.removeEventListener("seek", this.handleSeek);
    delete this.video.vsc;
    let idx = tc.mediaElements.indexOf(this.video);
    if (idx != -1) {
      tc.mediaElements.splice(idx, 1);
    }
  };

  tc.videoController.prototype.initializeControls = function () {
    log("initializeControls Begin", 5);
    const document = this.video.ownerDocument;
    const speed = this.video.playbackRate.toFixed(2);
    const rect = this.video.getBoundingClientRect();
    // getBoundingClientRect is relative to the viewport; style coordinates
    // are relative to offsetParent, so we adjust for that here. offsetParent
    // can be null if the video has `display: none` or is not yet in the DOM.
    const offsetRect = this.video.offsetParent?.getBoundingClientRect();
    const top = Math.max(rect.top - (offsetRect?.top || 0), 0) + "px";
    const left = Math.max(rect.left - (offsetRect?.left || 0), 0) + "px";

    log("Speed variable set to: " + speed, 5);

    var wrapper = document.createElement("div");
    wrapper.classList.add("vsc-controller");

    if (!this.video.currentSrc) {
      wrapper.classList.add("vsc-nosource");
    }

    if (tc.settings.startHidden) {
      wrapper.classList.add("vsc-hidden");
    }

    var shadow = wrapper.attachShadow({ mode: "open" });
    // changed Here : Comment => Display Speed Number on TopLeft HTML
    var shadowTemplate = `
        <style>
          @import "${chrome.runtime.getURL("shadow.css")}";
        </style>

        <div id="controller" style="top:${top}; left:${left}; opacity:${
      tc.settings.controllerOpacity
    }">
          <span data-action="drag" class="draggable">${speed}</span>
          <span id="controls">
            <button data-action="rewind" class="rw">«</button>
            <button data-action="slower">&minus;</button>
            <button data-action="faster">&plus;</button>
            <button data-action="advance" class="rw">»</button>
            <button data-action="display" class="hideButton">&times;</button>
          </span>
        </div>
      `;
    shadow.innerHTML = shadowTemplate;
    shadow.querySelector(".draggable").addEventListener(
      "mousedown",
      (e) => {
        runAction(e.target.dataset["action"], false, e);
        e.stopPropagation();
      },
      true
    );

    shadow.querySelectorAll("button").forEach(function (button) {
      button.addEventListener(
        "click",
        (e) => {
          runAction(
            e.target.dataset["action"],
            getKeyBindings(e.target.dataset["action"]),
            e
          );
          e.stopPropagation();
        },
        true
      );
    });

    shadow
      .querySelector("#controller")
      .addEventListener("click", (e) => e.stopPropagation(), false);
    shadow
      .querySelector("#controller")
      .addEventListener("mousedown", (e) => e.stopPropagation(), false);

    this.speedIndicator = shadow.querySelector("span");
    var fragment = document.createDocumentFragment();
    fragment.appendChild(wrapper);

    switch (true) {
      case location.hostname == "www.amazon.com":
      case location.hostname == "www.reddit.com":
      case /hbogo\./.test(location.hostname):
        // insert before parent to bypass overlay
        this.parent.parentElement.insertBefore(fragment, this.parent);
        break;
      case location.hostname == "www.facebook.com":
        // this is a monstrosity but new FB design does not have *any*
        // semantic handles for us to traverse the tree, and deep nesting
        // that we need to bubble up from to get controller to stack correctly
        let p =
          this.parent.parentElement.parentElement.parentElement.parentElement
            .parentElement.parentElement.parentElement;
        p.insertBefore(fragment, p.firstChild);
        break;
      case location.hostname == "tv.apple.com":
        // insert before parent to bypass overlay
        this.parent.parentNode.insertBefore(
          fragment,
          this.parent.parentNode.firstChild
        );
        break;
      default:
        // Note: when triggered via a MutationRecord, it's possible that the
        // target is not the immediate parent. This appends the controller as
        // the first element of the target, which may not be the parent.
        this.parent.insertBefore(fragment, this.parent.firstChild);
    }
    return wrapper;
  };
}

function escapeStringRegExp(str) {
  matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
  return str.replace(matchOperatorsRe, "\\$&");
}

function isBlacklisted() {
  blacklisted = false;
  tc.settings.blacklist.split("\n").forEach((match) => {
    match = match.replace(regStrip, "");
    if (match.length == 0) {
      return;
    }

    if (match.startsWith("/")) {
      try {
        var parts = match.split("/");

        if (regEndsWithFlags.test(match)) {
          var flags = parts.pop();
          var regex = parts.slice(1).join("/");
        } else {
          var flags = "";
          var regex = match;
        }

        var regexp = new RegExp(regex, flags);
      } catch (err) {
        return;
      }
    } else {
      var regexp = new RegExp(escapeStringRegExp(match));
    }

    if (regexp.test(location.href)) {
      blacklisted = true;
      return;
    }
  });
  return blacklisted;
}

var coolDown = false;
function refreshCoolDown() {
  log("Begin refreshCoolDown", 5);
  if (coolDown) {
    clearTimeout(coolDown);
  }
  coolDown = setTimeout(function () {
    coolDown = false;
  }, 1000);
  log("End refreshCoolDown", 5);
}

function setupListener() {
  /**
   * This function is run whenever a video speed rate change occurs.
   * It is used to update the speed that shows up in the display as well as save
   * that latest speed into the local storage.
   *
   * @param {*} video The video element to update the speed indicators for.
   */
  function updateSpeedFromEvent(video) {
    // It's possible to get a rate change on a VIDEO/AUDIO that doesn't have
    // a video controller attached to it.  If we do, ignore it.
    if (!video.vsc) return;
    var speedIndicator = video.vsc.speedIndicator;
    var src = video.currentSrc;
    var speed = Number(video.playbackRate.toFixed(2));

    log("Playback rate changed to " + speed, 4);

    log("Updating controller with new speed", 5);
    speedIndicator.textContent = speed.toFixed(2);
    tc.settings.speeds[src] = speed;
    log("Storing lastSpeed in settings for the rememberSpeed feature", 5);
    tc.settings.lastSpeed = speed;
    log("Syncing chrome settings for lastSpeed", 5);
    chrome.storage.sync.set({ lastSpeed: speed }, function () {
      log("Speed setting saved: " + speed, 5);
    });
    // show/display the controller for 1000ms if it's hidden.

    // changed Here:: Disable blink for PrimeVideos
    const skip_websites = ["primevideo"];
    if (skip_websites.includes(WEBSITES_NAME)) {
      return;
    }
    runAction("blink", null, null);
  }

  document.addEventListener(
    "ratechange",
    function (event) {
      if (coolDown) {
        log("Speed event propagation blocked", 4);
        event.stopImmediatePropagation();
      }
      var video = event.target;

      /**
       * If the last speed is forced, only update the speed based on events created by
       * video speed instead of all video speed change events.
       */
      if (tc.settings.forceLastSavedSpeed) {
        if (event.detail && event.detail.origin === "videoSpeed") {
          video.playbackRate = event.detail.speed;
          updateSpeedFromEvent(video);
        } else {
          video.playbackRate = tc.settings.lastSpeed;
        }
        event.stopImmediatePropagation();
      } else {
        updateSpeedFromEvent(video);
      }
    },
    true
  );
}

function initializeWhenReady(document) {
  log("Begin initializeWhenReady", 5);
  if (isBlacklisted()) {
    return;
  }
  window.onload = () => {
    initializeNow(window.document);
  };
  if (document) {
    if (document.readyState === "complete") {
      initializeNow(document);
    } else {
      document.onreadystatechange = () => {
        if (document.readyState === "complete") {
          initializeNow(document);
        }
      };
    }
  }
  log("End initializeWhenReady", 5);
}
function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}
function getShadow(parent) {
  let result = [];
  function getChild(parent) {
    if (parent.firstElementChild) {
      var child = parent.firstElementChild;
      do {
        result.push(child);
        getChild(child);
        if (child.shadowRoot) {
          result.push(getShadow(child.shadowRoot));
        }
        child = child.nextElementSibling;
      } while (child);
    }
  }
  getChild(parent);
  return result.flat(Infinity);
}

function initializeNow(document) {
  log("Begin initializeNow", 5);
  if (!tc.settings.enabled) return;
  // enforce init-once due to redundant callers
  if (!document.body || document.body.classList.contains("vsc-initialized")) {
    return;
  }
  try {
    setupListener();
  } catch {
    // no operation
  }
  document.body.classList.add("vsc-initialized");
  log("initializeNow: vsc-initialized added to document body", 5);

  if (document === window.document) {
    defineVideoController();
  } else {
    var link = document.createElement("link");
    link.href = chrome.runtime.getURL("inject.css");
    link.type = "text/css";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  var docs = Array(document);
  try {
    if (inIframe()) docs.push(window.top.document);
  } catch (e) {}

  document.addEventListener("keydown", function (event) {
    // changed here // keypress detection
    if (!tc.mediaElements.length) {
      return false;
    }
    if (event.ctrlKey && event.key === "q") {
      let percentage = prompt("Video Percentage:", "");
      if (
        isNaN(percentage) ||
        percentage === null ||
        percentage < 0 ||
        percentage > 10
      ) {
        return;
      }
      percentage = Number(percentage);
      // percentage.toPrecision(3);
      runAction_numbers(96 + percentage, null);
    } else if (event.ctrlKey && event.key === "b") {
      let seek_value = prompt(
        `Video Seek Seconds: \n CURRENT: ${tc.settings.keyBindings[2].value}`,
        ""
      );
      if (seek_value === null || isNaN(seek_value)) {
        return;
      }
      seek_value = Number(seek_value);
      // seek_value.toPrecision(3);
      tc.settings.keyBindings[2].value = seek_value;
      tc.settings.keyBindings[3].value = seek_value;
    } else if (event.altKey && event.key === "b") {
      let seek_value = prompt(
        `Video Plyback Speed Δ: \n CURRENT: ${tc.settings.keyBindings[0].value}`,
        ""
      );
      if (seek_value === null || isNaN(seek_value)) {
        return;
      }
      seek_value = Number(seek_value);
      // seek_value.toPrecision(3);
      tc.settings.keyBindings[0].value = seek_value;
      tc.settings.keyBindings[1].value = seek_value;
    } else if (event.ctrlKey && event.key === "0") {
      tc.mediaElements[0].playbackRate == 1
        ? runAction("faster", 16)
        : runAction("reset");
    } else if (event.ctrlKey && event.shiftKey && event.key === "q") {
      alert("0");
      allowNewTab = 0;
      // toggleNewtab();
    } else if (event.ctrlKey && event.shiftKey && event.key === "a") {
      alert("1");
      allowNewTab = 1;
      toggleNewtab();
    }
  });

  docs.forEach(function (doc) {
    doc.addEventListener(
      "keydown",
      function (event) {
        var keyCode = event.keyCode;
        log("Processing keydown event: " + keyCode, 6);

        // Ignore if following modifier is active.
        if (
          !event.getModifierState ||
          event.getModifierState("Alt") ||
          event.getModifierState("Control") ||
          event.getModifierState("Fn") ||
          event.getModifierState("Meta") ||
          event.getModifierState("Hyper") ||
          event.getModifierState("OS")
        ) {
          log("Keydown event ignored due to active modifier: " + keyCode, 5);
          return;
        }

        // Ignore keydown event if typing in an input box
        if (
          event.target.nodeName === "INPUT" ||
          event.target.nodeName === "TEXTAREA" ||
          event.target.isContentEditable
        ) {
          return false;
        }

        // Ignore keydown event if typing in a page without vsc
        if (!tc.mediaElements.length) {
          return false;
        }

        // Here detecting press...
        // changed here
        var item = tc.settings.keyBindings.find((x) => x.key === keyCode);
        if (item) {
          runAction(item.action, item.value);
          if (item.force === "true") {
            // disable websites key bindings
            event.preventDefault();
            event.stopPropagation();
          }
        } else if (96 <= keyCode && keyCode <= 105) {
          runAction_numbers(keyCode);
        } else if (keyCode == 70) {
          runAction_fullscreen(keyCode, null, doc);
        }

        return false;
      },
      true
    );
  });

  function checkForVideo(node, parent, added) {
    // Only proceed with supposed removal if node is missing from DOM
    if (!added && document.body.contains(node)) {
      return;
    }
    if (
      node.nodeName === "VIDEO" ||
      (node.nodeName === "AUDIO" && tc.settings.audioBoolean)
    ) {
      if (added) {
        node.vsc = new tc.videoController(node, parent);
      } else {
        if (node.vsc) {
          node.vsc.remove();
        }
      }
    } else if (node.children != undefined) {
      for (var i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        checkForVideo(child, child.parentNode || parent, added);
      }
    }
  }

  var observer = new MutationObserver(function (mutations) {
    // Process the DOM nodes lazily
    requestIdleCallback(
      (_) => {
        mutations.forEach(function (mutation) {
          switch (mutation.type) {
            case "childList":
              mutation.addedNodes.forEach(function (node) {
                if (typeof node === "function") return;
                if (node === document.documentElement) {
                  // This happens on sites that use document.write, e.g. watch.sling.com
                  // When the document gets replaced, we lose all event handlers, so we need to reinitialize
                  log("Document was replaced, reinitializing", 5);
                  initializeWhenReady(document);
                  return;
                }
                checkForVideo(node, node.parentNode || mutation.target, true);
              });
              mutation.removedNodes.forEach(function (node) {
                if (typeof node === "function") return;
                checkForVideo(node, node.parentNode || mutation.target, false);
              });
              break;
            case "attributes":
              if (
                (mutation.target.attributes["aria-hidden"] &&
                  mutation.target.attributes["aria-hidden"].value == "false") ||
                mutation.target.nodeName === "APPLE-TV-PLUS-PLAYER"
              ) {
                var flattenedNodes = getShadow(document.body);
                var nodes = flattenedNodes.filter((x) => x.tagName == "VIDEO");
                for (let node of nodes) {
                  // only add vsc the first time for the apple-tv case (the attribute change is triggered every time you click the vsc)
                  if (
                    node.vsc &&
                    mutation.target.nodeName === "APPLE-TV-PLUS-PLAYER"
                  )
                    continue;
                  if (node.vsc) node.vsc.remove();
                  checkForVideo(node, node.parentNode || mutation.target, true);
                }
              }
              break;
          }
        });
      },
      { timeout: 1000 }
    );
  });
  observer.observe(document, {
    attributeFilter: ["aria-hidden", "data-focus-method"],
    childList: true,
    subtree: true
  });

  if (tc.settings.audioBoolean) {
    var mediaTags = document.querySelectorAll("video,audio");
  } else {
    var mediaTags = document.querySelectorAll("video");
  }

  mediaTags.forEach(function (video) {
    video.vsc = new tc.videoController(video);
  });

  var frameTags = document.getElementsByTagName("iframe");
  Array.prototype.forEach.call(frameTags, function (frame) {
    // Ignore frames we don't have permission to access (different origin).
    try {
      var childDocument = frame.contentDocument;
    } catch (e) {
      return;
    }
    initializeWhenReady(childDocument);
  });
  log("End initializeNow", 5);
}

function setSpeed(video, speed) {
  log("setSpeed started: " + speed, 5);
  var speedvalue = speed.toFixed(2);
  if (tc.settings.forceLastSavedSpeed) {
    video.dispatchEvent(
      new CustomEvent("ratechange", {
        detail: { origin: "videoSpeed", speed: speedvalue }
      })
    );
  } else {
    video.playbackRate = Number(speedvalue);
  }
  var speedIndicator = video.vsc.speedIndicator;
  speedIndicator.textContent = speedvalue;
  tc.settings.lastSpeed = speed;
  refreshCoolDown();
  log("setSpeed finished: " + speed, 5);
}

function runAction_fullscreen(action, e, doc) {
  // changed here

  // TODO complete this function
  log("runAction_fullscreen Begin", 5);
  var mediaTags = tc.mediaElements;

  if (e) {
    var targetController = e.target.getRootNode().host;
  }
  console.log(WEBSITES_NAME);
  mediaTags.forEach(function (the_video, e) {
    var controller = the_video.vsc.div;

    // Don't change video time if the video has a different controller
    if (e && !(targetController == controller)) {
      return;
    }
    showController(controller);
    const skip_websites = ["netflix", "youtube"];

    // if (!the_video.classList.contains("vsc-cancelled")) {
    if (action == 70) {
      if (skip_websites.includes(WEBSITES_NAME)) {
        // console.log("Forbidden site to skip, so don't want to mess with it");
        // Forbidden site to skip, shows error/double skip when using this feature
        return;
      }
      console.log(the_video);
      console.log(doc);
      console.log(typeof doc);
      let keyevent = new KeyboardEvent("keypress", { key: "w", ctrlKey: true });
      doc.body.dispatchEvent(keyevent);
      log("Full Screen toggle", 5);
    }
    // }
  });
  log("runAction_fullscreen End", 5);
}

function runAction_numbers(action, e) {
  // changed here

  // divide video into 10 parts
  log("runAction_numbers Begin", 5);
  let skip_websites = ["netflix"];
  var mediaTags = tc.mediaElements;

  if (e) {
    var targetController = e.target.getRootNode().host;
  }

  mediaTags.forEach(function (the_video, e) {
    var controller = the_video.vsc.div;

    // Don't change video time if the video has a different controller
    if (e && !(targetController == controller)) {
      return;
    }
    showController(controller);

    // if (!the_video.classList.contains("vsc-cancelled")) {
    if (96 <= action && action <= 106) {
      if (skip_websites.includes(WEBSITES_NAME)) {
        // console.log("Forbidden site to skip, so don't want to mess with it");
        // Forbidden site to skip, shows error/double skip when using this feature
        return;
      }
      log(`Number ${action}`, 5);
      tmp = (action - 96) * (the_video.duration / 10);
      the_video.currentTime = tmp;
    }
    // }
  });

  log("runAction_numbers End", 5);
}

function runAction(action, value, e) {
  log("runAction Begin", 5);
  // changed here
  var mediaTags = tc.mediaElements;

  // Get the controller that was used if called from a button press event e
  if (e) {
    var targetController = e.target.getRootNode().host;
  }

  mediaTags.forEach(function (the_video) {
    // Here v is initalized
    var controller = the_video.vsc.div;

    // Don't change video speed if the video has a different controller
    if (e && !(targetController == controller)) {
      return;
    }

    showController(controller);

    // Changed Here ...
    const skip_websites = ["netflix"];
    const already_includes_websites = ["youtube"];

    if (!the_video.classList.contains("vsc-cancelled")) {
      if (action === "rewind") {
        if (skip_websites.includes(WEBSITES_NAME)) {
          // console.log("Forbidden site to skip, so don't want to mess with it");
          // Forbidden site to skip, shows error/double skip when using this feature
          return;
        }
        if (already_includes_websites.includes(WEBSITES_NAME)) {
          // console.log("Forbidden site to skip, so don't want to mess with it");
          // Forbidden site to skip, shows error/double skip when using this feature
          value -= 5;
        }

        log("Rewind", 5);
        // Changed Here ...
        setTimeout(() => {
          the_video.currentTime -= value;
        }, 0);
      } else if (action === "advance") {
        if (skip_websites.includes(WEBSITES_NAME)) {
          log("Forbidden site to skip, so don't want to mess with it", 5);
          // console.log("Forbidden site to skip, so don't want to mess with it");
          // Forbidden site to skip, shows error/double skip when using this feature
          return;
        }
        if (already_includes_websites.includes(WEBSITES_NAME)) {
          // console.log("Forbidden site to skip, so don't want to mess with it");
          // Forbidden site to skip, shows error/double skip when using this feature
          value -= 5;
        }
        log("Fast forward", 5);
        // Changed Here ...
        setTimeout(() => {
          the_video.currentTime += value;
        }, 0);
      } else if (action === "faster") {
        log("Increase speed", 5);
        // Maximum playback speed in Chrome is set to 16:
        // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/media/html_media_element.cc?gsn=kMinRate&l=166
        var s = Math.min(
          (the_video.playbackRate < 0.1 ? 0.0 : the_video.playbackRate) + value,
          16
        );
        setSpeed(the_video, s);
      } else if (action === "slower") {
        log("Decrease speed", 5);
        // Video min rate is 0.0625:
        // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/media/html_media_element.cc?gsn=kMinRate&l=165
        var s = Math.max(the_video.playbackRate - value, 0.0);
        setSpeed(the_video, s);
      } else if (action === "reset") {
        log("Reset speed", 5);
        resetSpeed(the_video, 1.0, action);
      } else if (action === "display") {
        log("Showing controller", 5);
        controller.classList.add("vsc-manual");
        controller.classList.toggle("vsc-hidden");
      } else if (action === "blink") {
        log("Showing controller momentarily", 5);
        // if vsc is hidden, show it briefly to give the use visual feedback that the action is excuted.
        if (
          controller.classList.contains("vsc-hidden") ||
          controller.blinkTimeOut !== undefined
        ) {
          clearTimeout(controller.blinkTimeOut);
          controller.classList.remove("vsc-hidden");
          controller.blinkTimeOut = setTimeout(
            () => {
              controller.classList.add("vsc-hidden");
              controller.blinkTimeOut = undefined;
            },
            value ? value : 1000
          );
        }
      } else if (action === "drag") {
        handleDrag(the_video, e);
      } else if (action === "fast") {
        resetSpeed(the_video, value, action);
      } else if (action === "pause") {
        pause(v);
      } else if (action === "muted") {
        muted(v);
      } else if (action === "mark") {
        setMark(v);
      } else if (action === "jump") {
        jumpToMark(v);
      }
    }
  });
  log("runAction End", 5);
}

function pause(v) {
  if (the_video.paused) {
    log("Resuming video", 5);
    the_video.play();
  } else {
    log("Pausing video", 5);
    the_video.pause();
  }
}

function resetSpeed(the_video, target, button) {
  // changed from toggle to reset
  if (button === "reset") {
    if (the_video.playbackRate === 1.0) {
      return;
    }
    setKeyBindings("fast", the_video.playbackRate);
    setSpeed(the_video, 1.0);
    return;
  }
  if (the_video.playbackRate === target) {
    if (the_video.playbackRate === getKeyBindings("reset")) {
      if (target !== 1.0) {
        log("Resetting playback speed to 1.0", 4);
        setSpeed(the_video, 1.0);
      } else {
        log('Toggling playback speed to "fast" speed', 4);
        setSpeed(the_video, getKeyBindings("fast"));
      }
    } else {
      log('Toggling playback speed to "reset" speed', 4);
      setSpeed(the_video, getKeyBindings("reset"));
    }
  } else {
    log('Toggling playback speed to "reset" speed', 4);
    setKeyBindings("reset", the_video.playbackRate);
    setSpeed(the_video, target);
  }
}

function muted(v) {
  the_video.muted = the_video.muted !== true;
}

function setMark(v) {
  log("Adding marker", 5);
  the_video.vsc.mark = the_video.currentTime;
}

function jumpToMark(v) {
  log("Recalling marker", 5);
  if (the_video.vsc.mark && typeof the_video.vsc.mark === "number") {
    the_video.currentTime = the_video.vsc.mark;
  }
}

function handleDrag(video, e) {
  const controller = video.vsc.div;
  const shadowController = controller.shadowRoot.querySelector("#controller");

  // Find nearest parent of same size as video parent.
  var parentElement = controller.parentElement;
  while (
    parentElement.parentNode &&
    parentElement.parentNode.offsetHeight === parentElement.offsetHeight &&
    parentElement.parentNode.offsetWidth === parentElement.offsetWidth
  ) {
    parentElement = parentElement.parentNode;
  }

  video.classList.add("vcs-dragging");
  shadowController.classList.add("dragging");

  const initialMouseXY = [e.clientX, e.clientY];
  const initialControllerXY = [
    parseInt(shadowController.style.left),
    parseInt(shadowController.style.top)
  ];

  const startDragging = (e) => {
    let style = shadowController.style;
    let dx = e.clientX - initialMouseXY[0];
    let dy = e.clientY - initialMouseXY[1];
    style.left = initialControllerXY[0] + dx + "px";
    style.top = initialControllerXY[1] + dy + "px";
  };

  const stopDragging = () => {
    parentElement.removeEventListener("mousemove", startDragging);
    parentElement.removeEventListener("mouseup", stopDragging);
    parentElement.removeEventListener("mouseleave", stopDragging);

    shadowController.classList.remove("dragging");
    video.classList.remove("vcs-dragging");
  };

  parentElement.addEventListener("mouseup", stopDragging);
  parentElement.addEventListener("mouseleave", stopDragging);
  parentElement.addEventListener("mousemove", startDragging);
}

var timer = null;
function showController(controller) {
  log("Showing controller", 4);
  controller.classList.add("vcs-show");

  if (timer) clearTimeout(timer);

  timer = setTimeout(function () {
    controller.classList.remove("vcs-show");
    timer = false;
    log("Hiding controller", 5);
  }, 2000);
}
