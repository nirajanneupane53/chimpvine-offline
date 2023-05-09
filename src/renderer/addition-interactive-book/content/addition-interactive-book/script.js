H5P.AdvancedText = (function ($, EventDispatcher) {

  /**
   * A simple library for displaying text with advanced styling.
   *
   * @class H5P.AdvancedText
   * @param {Object} parameters
   * @param {Object} [parameters.text='New text']
   * @param {number} id
   */
  function AdvancedText(parameters, id) {
    var self = this;
    EventDispatcher.call(this);

    var html = (parameters.text === undefined ? '<em>New text</em>' : parameters.text);

    /**
     * Wipe container and add text html.
     *
     * @alias H5P.AdvancedText#attach
     * @param {H5P.jQuery} $container
     */
    self.attach = function ($container) {
      $container.addClass('h5p-advanced-text').html(html);
    };
  }

  AdvancedText.prototype = Object.create(EventDispatcher.prototype);
  AdvancedText.prototype.constructor = AdvancedText;

  return AdvancedText;

})(H5P.jQuery, H5P.EventDispatcher);
;var H5P = H5P || {};

/**
 * H5P audio module
 *
 * @external {jQuery} $ H5P.jQuery
 */
H5P.Audio = (function ($) {
  /**
  * @param {Object} params Options for this library.
  * @param {Number} id Content identifier.
  * @param {Object} extras Extras.
  * @returns {undefined}
  */
  function C(params, id, extras) {
    H5P.EventDispatcher.call(this);

    this.contentId = id;
    this.params = params;
    this.extras = extras;
    this.toggleButtonEnabled = true;

    // Retrieve previous state
    if (extras && extras.previousState !== undefined) {
      this.oldTime = extras.previousState.currentTime;
    }

    this.params = $.extend({}, {
      playerMode: 'minimalistic',
      fitToWrapper: false,
      controls: true,
      autoplay: false,
      audioNotSupported: "Your browser does not support this audio",
      playAudio: "Play audio",
      pauseAudio: "Pause audio"
    }, params);

    // Required if e.g. used in CoursePresentation as area to click on
    if (this.params.playerMode === 'transparent') {
      this.params.fitToWrapper = true;
    }

    this.on('resize', this.resize, this);
  }

  C.prototype = Object.create(H5P.EventDispatcher.prototype);
  C.prototype.constructor = C;

  /**
   * Adds a minimalistic audio player with only "play" and "pause" functionality.
   *
   * @param {jQuery} $container Container for the player.
   * @param {boolean} transparentMode true: the player is only visible when hovering over it; false: player's UI always visible
   */
  C.prototype.addMinimalAudioPlayer = function ($container, transparentMode) {
    var INNER_CONTAINER = 'h5p-audio-inner';
    var AUDIO_BUTTON = 'h5p-audio-minimal-button';
    var PLAY_BUTTON = 'h5p-audio-minimal-play';
    var PLAY_BUTTON_PAUSED = 'h5p-audio-minimal-play-paused';
    var PAUSE_BUTTON = 'h5p-audio-minimal-pause';

    var self = this;
    this.$container = $container;

    self.$inner = $('<div/>', {
      'class': INNER_CONTAINER + (transparentMode ? ' h5p-audio-transparent' : '')
    }).appendTo($container);

    var audioButton = $('<button/>', {
      'class': AUDIO_BUTTON + " " + PLAY_BUTTON,
      'aria-label': this.params.playAudio
    }).appendTo(self.$inner)
      .click( function () {
        if (!self.isEnabledToggleButton()) {
          return;
        }

        // Prevent ARIA from playing over audio on click
        this.setAttribute('aria-hidden', 'true');

        if (self.audio.paused) {
          self.play();
        }
        else {
          self.pause();
        }
      })
      .on('focusout', function () {
        // Restore ARIA, required when playing longer audio and tabbing out and back in
        this.setAttribute('aria-hidden', 'false');
      });

    // Fit to wrapper
    if (this.params.fitToWrapper) {
      audioButton.css({
        'width': '100%',
        'height': '100%'
      });
    }

    //Event listeners that change the look of the player depending on events.
    self.audio.addEventListener('ended', function () {
      audioButton
        .attr('aria-hidden', false)
        .attr('aria-label', self.params.playAudio)
        .removeClass(PAUSE_BUTTON)
        .removeClass(PLAY_BUTTON_PAUSED)
        .addClass(PLAY_BUTTON);
    });

    self.audio.addEventListener('play', function () {
      audioButton
        .attr('aria-label', self.params.pauseAudio)
        .removeClass(PLAY_BUTTON)
        .removeClass(PLAY_BUTTON_PAUSED)
        .addClass(PAUSE_BUTTON);
    });

    self.audio.addEventListener('pause', function () {
      audioButton
        .attr('aria-hidden', false)
        .attr('aria-label', self.params.playAudio)
        .removeClass(PAUSE_BUTTON)
        .addClass(PLAY_BUTTON_PAUSED);
    });

    this.$audioButton = audioButton;
    // Scale icon to container
    self.resize();
  };

  /**
   * Resizes the audio player icon when the wrapper is resized.
   */
  C.prototype.resize = function () {
    // Find the smallest value of height and width, and use it to choose the font size.
    if (this.params.fitToWrapper && this.$container && this.$container.width()) {
      var w = this.$container.width();
      var h = this.$container.height();
      if (w < h) {
        this.$audioButton.css({'font-size': w / 2 + 'px'});
      }
      else {
        this.$audioButton.css({'font-size': h / 2 + 'px'});
      }
    }
  };

  return C;
})(H5P.jQuery);

/**
 * Wipe out the content of the wrapper and put our HTML in it.
 *
 * @param {jQuery} $wrapper Our poor container.
 */
H5P.Audio.prototype.attach = function ($wrapper) {
  const self = this;
  $wrapper.addClass('h5p-audio-wrapper');

  // Check if browser supports audio.
  var audio = document.createElement('audio');
  if (audio.canPlayType === undefined) {
    this.attachNotSupportedMessage($wrapper);
    return;
  }

  // Add supported source files.
  if (this.params.files !== undefined && this.params.files instanceof Object) {
    for (var i = 0; i < this.params.files.length; i++) {
      var file = this.params.files[i];

      if (audio.canPlayType(file.mime)) {
        var source = document.createElement('source');
        source.src = H5P.getPath(file.path, this.contentId);
        source.type = file.mime;
        audio.appendChild(source);
      }
    }
  }

  if (!audio.children.length) {
    this.attachNotSupportedMessage($wrapper);
    return;
  }

  if (this.endedCallback !== undefined) {
    audio.addEventListener('ended', this.endedCallback, false);
  }

  audio.className = 'h5p-audio';
  audio.controls = this.params.controls === undefined ? true : this.params.controls;

  // Menu removed, because it's cut off if audio is used as H5P.Question intro
  const controlsList = 'nodownload noplaybackrate';
  audio.setAttribute('controlsList', controlsList);

  audio.preload = 'auto';
  audio.style.display = 'block';

  if (this.params.fitToWrapper === undefined || this.params.fitToWrapper) {
    audio.style.width = '100%';
    if (!this.isRoot()) {
      // Only set height if this isn't a root
      audio.style.height = '100%';
    }
  }

  this.audio = audio;

  if (this.params.playerMode === 'minimalistic') {
    audio.controls = false;
    this.addMinimalAudioPlayer($wrapper, false);
  }
  else if (this.params.playerMode === 'transparent') {
    audio.controls = false;
    this.addMinimalAudioPlayer($wrapper, true);
  }
  else {
    $wrapper.html(audio);
  }

  if (audio.controls) {
    $wrapper.addClass('h5p-audio-controls');
  }

  // Set time to saved time from previous run
  if (this.oldTime) {
    this.seekTo(this.oldTime);
  }

  // Avoid autoplaying in authoring tool
  if (window.H5PEditor === undefined) {
    // Keep record of autopauses.
    // I.e: we don't wanna autoplay if the user has excplicitly paused.
    self.autoPaused = true;

    // Set up intersection observer
    new IntersectionObserver(function (entries) {
      const entry = entries[0];

      if (entry.intersectionRatio == 0) {
        if (!self.audio.paused) {
          // Audio element is hidden, pause it
          self.autoPaused = true;
          self.audio.pause();
        }
      }
      else if (self.params.autoplay && self.autoPaused) {
        // Audio element is visible. Autoplay if autoplay is enabled and it was
        // not explicitly paused by a user
        self.autoPaused = false;
        self.audio.play();
      }
    }, {
      root: document.documentElement,
      threshold: [0, 1] // Get events when it is shown and hidden
    }).observe($wrapper.get(0));
  }
};

/**
 * Attaches not supported message.
 *
 * @param {jQuery} $wrapper Our dear container.
 */
H5P.Audio.prototype.attachNotSupportedMessage = function ($wrapper) {
  $wrapper.addClass('h5p-audio-not-supported');
  $wrapper.html(
    '<div class="h5p-audio-inner">' +
      '<div class="h5p-audio-not-supported-icon"><span/></div>' +
      '<span>' + this.params.audioNotSupported + '</span>' +
    '</div>'
  );

  if (this.endedCallback !== undefined) {
    this.endedCallback();
  }
}

/**
 * Stop the audio. TODO: Rename to pause?
 *
 * @returns {undefined}
 */
H5P.Audio.prototype.stop = function () {
  if (this.flowplayer !== undefined) {
    this.flowplayer.stop().close().unload();
  }
  if (this.audio !== undefined) {
    this.audio.pause();
  }
};

/**
 * Play
 */
H5P.Audio.prototype.play = function () {
  if (this.flowplayer !== undefined) {
    this.flowplayer.play();
  }
  if (this.audio !== undefined) {
    this.audio.play();
  }
};

/**
 * @public
 * Pauses the audio.
 */
H5P.Audio.prototype.pause = function () {
  if (this.audio !== undefined) {
    this.audio.pause();
  }
};

/**
 * @public
 * Seek to audio position.
 *
 * @param {number} seekTo Time to seek to in seconds.
 */
H5P.Audio.prototype.seekTo = function (seekTo) {
  if (this.audio !== undefined) {
    this.audio.currentTime = seekTo;
  }
};

/**
 * @public
 * Get current state for resetting it later.
 *
 * @returns {object} Current state.
 */
H5P.Audio.prototype.getCurrentState = function () {
  if (this.audio !== undefined) {
    const currentTime = this.audio.ended ? 0 : this.audio.currentTime;
    return {
      currentTime: currentTime
    };
  }
};

/**
 * @public
 * Disable button.
 * Not using disabled attribute to block button activation, because it will
 * implicitly set tabindex = -1 and confuse ChromeVox navigation. Clicks handled
 * using "pointer-events: none" in CSS.
 */
H5P.Audio.prototype.disableToggleButton = function () {
  this.toggleButtonEnabled = false;
  if (this.$audioButton) {
    this.$audioButton.addClass(H5P.Audio.BUTTON_DISABLED);
  }
};

/**
 * @public
 * Enable button.
 */
H5P.Audio.prototype.enableToggleButton = function () {
  this.toggleButtonEnabled = true;
  if (this.$audioButton) {
    this.$audioButton.removeClass(H5P.Audio.BUTTON_DISABLED);
  }
};

/**
 * @public
 * Check if button is enabled.
 * @return {boolean} True, if button is enabled. Else false.
 */
H5P.Audio.prototype.isEnabledToggleButton = function () {
  return this.toggleButtonEnabled;
};

/** @constant {string} */
H5P.Audio.BUTTON_DISABLED = 'h5p-audio-disabled';
;H5P.Column = (function (EventDispatcher) {

  /**
   * Column Constructor
   *
   * @class
   * @param {Object} params Describes task behavior
   * @param {number} id Content identifier
   * @param {Object} data User specific data to adapt behavior
   */
  function Column(params, id, data) {
    /** @alias H5P.Column# */
    var self = this;

    // We support events by extending this class
    EventDispatcher.call(self);

    // Add defaults
    params = params || {};
    if (params.useSeparators === undefined) {
      params.useSeparators = true;
    }

    this.contentData = data;

    // Column wrapper element
    var wrapper;

    // H5P content in the column
    var instances = [];
    var instanceContainers = [];

    // Number of tasks among instances
    var numTasks = 0;

    // Number of tasks that has been completed
    var numTasksCompleted = 0;

    // Keep track of result for each task
    var tasksResultEvent = [];

    // Keep track of last content's margin state
    var previousHasMargin;

    /**
     * Calculate score and trigger completed event.
     *
     * @private
     */
    var completed = function () {
      // Sum all scores
      var raw = 0;
      var max = 0;

      for (var i = 0; i < tasksResultEvent.length; i++) {
        var event = tasksResultEvent[i];
        raw += event.getScore();
        max += event.getMaxScore();
      }

      self.triggerXAPIScored(raw, max, 'completed');
    };

    /**
     * Generates an event handler for the given task index.
     *
     * @private
     * @param {number} taskIndex
     * @return {function} xAPI event handler
     */
    var trackScoring = function (taskIndex) {
      return function (event) {
        if (event.getScore() === null) {
          return; // Skip, not relevant
        }

        if (tasksResultEvent[taskIndex] === undefined) {
          // Update number of completed tasks
          numTasksCompleted++;
        }

        // Keep track of latest event with result
        tasksResultEvent[taskIndex] = event;

        // Track progress
        var progressed = self.createXAPIEventTemplate('progressed');
        progressed.data.statement.object.definition.extensions['http://id.tincanapi.com/extension/ending-point'] = taskIndex + 1;
        self.trigger(progressed);

        // Check to see if we're done
        if (numTasksCompleted === numTasks) {
          // Run this after the current event is sent
          setTimeout(function () {
            completed(); // Done
          }, 0);
        }
      };
    };

    /**
     * Creates a new ontent instance from the given content parameters and
     * then attaches it the wrapper. Sets up event listeners.
     *
     * @private
     * @param {Object} content Parameters
     * @param {Object} [contentData] Content Data
     */
    var addRunnable = function (content, contentData) {
      // Create container for content
      var container = document.createElement('div');
      container.classList.add('h5p-column-content');

      // Content overrides
      var library = content.library.split(' ')[0];
      if (library === 'H5P.Video') {
        // Prevent video from growing endlessly since height is unlimited.
        content.params.visuals.fit = false;
      }

      // Create content instance
      var instance = H5P.newRunnable(content, id, undefined, true, contentData);

      // Bubble resize events
      bubbleUp(instance, 'resize', self);

      // Check if instance is a task
      if (Column.isTask(instance)) {
        // Tasks requires completion

        instance.on('xAPI', trackScoring(numTasks));
        numTasks++;
      }

      if (library === 'H5P.Image') {
        // Resize when images are loaded

        instance.on('loaded', function () {
          self.trigger('resize');
        });
      }

      // Keep track of all instances
      instances.push(instance);
      instanceContainers.push({
        hasAttached: false,
        container: container,
        instanceIndex: instances.length - 1,
      });

      // Add to DOM wrapper
      wrapper.appendChild(container);
    };

    /**
     * Help get data for content at given index
     *
     * @private
     * @param {number} index
     * @returns {Object} Data object with previous state
     */
    var grabContentData = function (index) {
      var contentData = {
        parent: self
      };

      if (data.previousState && data.previousState.instances && data.previousState.instances[index]) {
        contentData.previousState = data.previousState.instances[index];
      }

      return contentData;
    };

    /**
     * Adds separator before the next content.
     *
     * @private
     * @param {string} libraryName Name of the next content type
     * @param {string} useSeparator
     */
    var addSeparator = function (libraryName, useSeparator) {
      // Determine separator spacing
      var thisHasMargin = (hasMargins.indexOf(libraryName) !== -1);

      // Only add if previous content exists
      if (previousHasMargin !== undefined) {

        // Create separator element
        var separator = document.createElement('div');
        //separator.classList.add('h5p-column-ruler');

        // If no margins, check for top margin only
        if (!thisHasMargin && (hasTopMargins.indexOf(libraryName) === -1)) {
          if (!previousHasMargin) {
            // None of them have margin

            // Only add separator if forced
            if (useSeparator === 'enabled') {
              // Add ruler
              separator.classList.add('h5p-column-ruler');

              // Add space both before and after the ruler
              separator.classList.add('h5p-column-space-before-n-after');
            }
            else {
              // Default is to separte using a single space, no ruler
              separator.classList.add('h5p-column-space-before');
            }
          }
          else {
            // We don't have any margin but the previous content does

            // Only add separator if forced
            if (useSeparator === 'enabled') {
              // Add ruler
              separator.classList.add('h5p-column-ruler');

              // Add space after the ruler
              separator.classList.add('h5p-column-space-after');
            }
          }
        }
        else if (!previousHasMargin) {
          // We have margin but not the previous content doesn't

          // Only add separator if forced
          if (useSeparator === 'enabled') {
            // Add ruler
            separator.classList.add('h5p-column-ruler');

            // Add space after the ruler
            separator.classList.add('h5p-column-space-before');
          }
        }
        else {
          // Both already have margin

          if (useSeparator !== 'disabled') {
            // Default is to add ruler unless its disabled
            separator.classList.add('h5p-column-ruler');
          }
        }

        // Insert into DOM
        wrapper.appendChild(separator);
      }

      // Keep track of spacing for next separator
      previousHasMargin = thisHasMargin || (hasBottomMargins.indexOf(libraryName) !== -1);
    };

    /**
     * Creates a wrapper and the column content the first time the column
     * is attached to the DOM.
     *
     * @private
     */
    var createHTML = function () {
      // Create wrapper
      wrapper = document.createElement('div');

      // Go though all contents
      for (var i = 0; i < params.content.length; i++) {
        var content = params.content[i];

        // In case the author has created an element without selecting any
        // library
        if (content.content === undefined) {
          continue;
        }

        if (params.useSeparators) { // (check for global override)

          // Add separator between contents
          addSeparator(content.content.library.split(' ')[0], content.useSeparator);
        }

        // Add content
        addRunnable(content.content, grabContentData(i));
      }
    };

    /**
     * Attach the column to the given container
     *
     * @param {H5P.jQuery} $container
     */
    self.attach = function ($container) {
      if (wrapper === undefined) {
        // Create wrapper and content
        createHTML();
      }

      // Attach instances that have not been attached
      instanceContainers.filter(function (container) { return !container.hasAttached })
        .forEach(function (container) {
          instances[container.instanceIndex]
            .attach(H5P.jQuery(container.container));

          // Remove any fullscreen buttons
          disableFullscreen(instances[container.instanceIndex]);
        });


      // Add to DOM
      $container.addClass('h5p-column').html('').append(wrapper);
    };

    /**
     * Create object containing information about the current state
     * of this content.
     *
     * @return {Object}
     */
    self.getCurrentState = function () {
      // Get previous state object or create new state object
      var state = (data.previousState ? data.previousState : {});
      if (!state.instances) {
        state.instances = [];
      }

      // Grab the current state for each instance
      for (var i = 0; i < instances.length; i++) {
        var instance = instances[i];

        if (instance.getCurrentState instanceof Function ||
            typeof instance.getCurrentState === 'function') {

          state.instances[i] = instance.getCurrentState();
        }
      }

      // Done
      return state;
    };

    /**
     * Get xAPI data.
     * Contract used by report rendering engine.
     *
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
     */
    self.getXAPIData = function () {
      var xAPIEvent = self.createXAPIEventTemplate('answered');
      addQuestionToXAPI(xAPIEvent);
      xAPIEvent.setScoredResult(self.getScore(),
        self.getMaxScore(),
        self,
        true,
        self.getScore() === self.getMaxScore()
      );
      return {
        statement: xAPIEvent.data.statement,
        children: getXAPIDataFromChildren(instances)
      };
    };

    /**
     * Get score for all children
     * Contract used for getting the complete score of task.
     *
     * @return {number} Score for questions
     */
    self.getScore = function () {
      return instances.reduce(function (prev, instance) {
        return prev + (instance.getScore ? instance.getScore() : 0);
      }, 0);
    };

    /**
     * Get maximum score possible for all children instances
     * Contract.
     *
     * @return {number} Maximum score for questions
     */
    self.getMaxScore = function () {
      return instances.reduce(function (prev, instance) {
        return prev + (instance.getMaxScore ? instance.getMaxScore() : 0);
      }, 0);
    };

    /**
     * Get answer given
     * Contract.
     *
     * @return {boolean} True, if all answers have been given.
     */
    self.getAnswerGiven = function () {
      return instances.reduce(function (prev, instance) {
        return prev && (instance.getAnswerGiven ? instance.getAnswerGiven() : prev);
      }, true);
    };

    /**
     * Show solutions.
     * Contract.
     */
    self.showSolutions = function () {
      instances.forEach(function (instance) {
        if (instance.toggleReadSpeaker) {
          instance.toggleReadSpeaker(true);
        }
        if (instance.showSolutions) {
          instance.showSolutions();
        }
        if (instance.toggleReadSpeaker) {
          instance.toggleReadSpeaker(false);
        }
      });
    };

    /**
     * Reset task.
     * Contract.
     */
    self.resetTask = function () {
      instances.forEach(function (instance) {
        if (instance.resetTask) {
          instance.resetTask();
        }
      });
    };

    /**
     * Get instances for all children
     * TODO: This is not a good interface, we should provide handling needed
     * handling of the tasks instead of repeating them for each parent...
     *
     * @return {Object[]} array of instances
     */
    self.getInstances = function () {
      return instances;
    };

    /**
     * Get title, e.g. for xAPI when Column is subcontent.
     *
     * @return {string} Title.
     */
    self.getTitle = function () {
      return H5P.createTitle((self.contentData && self.contentData.metadata && self.contentData.metadata.title) ? self.contentData.metadata.title : 'Column');
    };

    /**
     * Add the question itself to the definition part of an xAPIEvent
     */
    var addQuestionToXAPI = function (xAPIEvent) {
      var definition = xAPIEvent.getVerifiedStatementValue(['object', 'definition']);
      H5P.jQuery.extend(definition, getxAPIDefinition());
    };

    /**
     * Generate xAPI object definition used in xAPI statements.
     * @return {Object}
     */
    var getxAPIDefinition = function () {
      var definition = {};

      definition.interactionType = 'compound';
      definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
      definition.description = {
        'en-US': ''
      };

      return definition;
    };

    /**
     * Get xAPI data from sub content types
     *
     * @param {Array} of H5P instances
     * @returns {Array} of xAPI data objects used to build a report
     */
    var getXAPIDataFromChildren = function (children) {
      return children.map(function (child) {
        if (typeof child.getXAPIData == 'function') {
          return child.getXAPIData();
        }
      }).filter(function (data) {
        return !!data;
      });
    };

    // Resize children to fit inside parent
    bubbleDown(self, 'resize', instances);

    if (wrapper === undefined) {
      // Create wrapper and content
      createHTML();
    }

    self.setActivityStarted();
  }

  Column.prototype = Object.create(EventDispatcher.prototype);
  Column.prototype.constructor = Column;

  /**
   * Makes it easy to bubble events from parent to children
   *
   * @private
   * @param {Object} origin Origin of the Event
   * @param {string} eventName Name of the Event
   * @param {Array} targets Targets to trigger event on
   */
  function bubbleDown(origin, eventName, targets) {
    origin.on(eventName, function (event) {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      for (var i = 0; i < targets.length; i++) {
        targets[i].trigger(eventName, event);
      }
    });
  }

  /**
   * Makes it easy to bubble events from child to parent
   *
   * @private
   * @param {Object} origin Origin of the Event
   * @param {string} eventName Name of the Event
   * @param {Object} target Target to trigger event on
   */
  function bubbleUp(origin, eventName, target) {
    origin.on(eventName, function (event) {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Definition of which content types are tasks
   */
  var isTasks = [
    'H5P.ImageHotspotQuestion',
    'H5P.Blanks',
    'H5P.Essay',
    'H5P.SingleChoiceSet',
    'H5P.MultiChoice',
    'H5P.TrueFalse',
    'H5P.DragQuestion',
    'H5P.Summary',
    'H5P.DragText',
    'H5P.MarkTheWords',
    'H5P.MemoryGame',
    'H5P.QuestionSet',
    'H5P.InteractiveVideo',
    'H5P.CoursePresentation',
    'H5P.DocumentationTool'
  ];

  /**
   * Check if the given content instance is a task (will give a score)
   *
   * @param {Object} instance
   * @return {boolean}
   */
  Column.isTask = function (instance) {
    if (instance.isTask !== undefined) {
      return instance.isTask; // Content will determine self if it's a task
    }

    // Go through the valid task names
    for (var i = 0; i < isTasks.length; i++) {
      // Check against library info. (instanceof is broken in H5P.newRunnable)
      if (instance.libraryInfo.machineName === isTasks[i]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Definition of which content type have margins
   */
  var hasMargins = [
    'H5P.AdvancedText',
    'H5P.AudioRecorder',
    'H5P.Essay',
    'H5P.Link',
    'H5P.Accordion',
    'H5P.Table',
    'H5P.GuessTheAnswer',
    'H5P.Blanks',
    'H5P.MultiChoice',
    'H5P.TrueFalse',
    'H5P.DragQuestion',
    'H5P.Summary',
    'H5P.DragText',
    'H5P.MarkTheWords',
    'H5P.ImageHotspotQuestion',
    'H5P.MemoryGame',
    'H5P.Dialogcards',
    'H5P.QuestionSet',
    'H5P.DocumentationTool'
  ];

  /**
   * Definition of which content type have top margins
   */
  var hasTopMargins = [
    'H5P.SingleChoiceSet'
  ];

  /**
   * Definition of which content type have bottom margins
   */
  var hasBottomMargins = [
    'H5P.CoursePresentation',
    'H5P.Dialogcards',
    'H5P.GuessTheAnswer',
    'H5P.ImageSlider'
  ];

  /**
   * Remove custom fullscreen buttons from sub content.
   * (A bit of a hack, there should have been some sort of override…)
   *
   * @param {Object} instance
   */
  function disableFullscreen(instance) {
    switch (instance.libraryInfo.machineName) {
      case 'H5P.CoursePresentation':
        if (instance.$fullScreenButton) {
          instance.$fullScreenButton.remove();
        }
        break;

      case 'H5P.InteractiveVideo':
        instance.on('controls', function () {
          if (instance.controls.$fullscreen) {
            instance.controls.$fullscreen.remove();
          }
        });
        break;
    }
  }

  return Column;
})(H5P.EventDispatcher);
;var H5P = H5P || {};

/**
 * Constructor.
 *
 * @param {Object} params Options for this library.
 * @param {Number} id Content identifier
 * @returns {undefined}
 */
(function ($) {
  H5P.Image = function (params, id, extras) {
    H5P.EventDispatcher.call(this);
    this.extras = extras;

    if (params.file === undefined || !(params.file instanceof Object)) {
      this.placeholder = true;
    }
    else {
      this.source = H5P.getPath(params.file.path, id);
      this.width = params.file.width;
      this.height = params.file.height;
    }

    this.alt = (!params.decorative && params.alt !== undefined) ? params.alt : '';

    if (params.title !== undefined) {
      this.title = params.title;
    }
  };

  H5P.Image.prototype = Object.create(H5P.EventDispatcher.prototype);
  H5P.Image.prototype.constructor = H5P.Image;

  /**
   * Wipe out the content of the wrapper and put our HTML in it.
   *
   * @param {jQuery} $wrapper
   * @returns {undefined}
   */
  H5P.Image.prototype.attach = function ($wrapper) {
    var self = this;
    var source = this.source;

    if (self.$img === undefined) {
      if(self.placeholder) {
        self.$img = $('<div>', {
          width: '100%',
          height: '100%',
          class: 'h5p-placeholder',
          title: this.title === undefined ? '' : this.title,
          on: {
            load: function () {
              self.trigger('loaded');
            }
          }
        });
      } else {
        self.$img = $('<img>', {
          width: '100%',
          height: '100%',
          src: source,
          alt: this.alt,
          title: this.title === undefined ? '' : this.title,
          on: {
            load: function () {
              self.trigger('loaded');
            }
          }
        });
      }
    }

    $wrapper.addClass('h5p-image').html(self.$img);
  };

  return H5P.Image;
}(H5P.jQuery));
;var H5P = H5P || {};
/**
 * Transition contains helper function relevant for transitioning
 */
H5P.Transition = (function ($) {

  /**
   * @class
   * @namespace H5P
   */
  Transition = {};

  /**
   * @private
   */
  Transition.transitionEndEventNames = {
    'WebkitTransition': 'webkitTransitionEnd',
    'transition':       'transitionend',
    'MozTransition':    'transitionend',
    'OTransition':      'oTransitionEnd',
    'msTransition':     'MSTransitionEnd'
  };

  /**
   * @private
   */
  Transition.cache = [];

  /**
   * Get the vendor property name for an event
   *
   * @function H5P.Transition.getVendorPropertyName
   * @static
   * @private
   * @param  {string} prop Generic property name
   * @return {string}      Vendor specific property name
   */
  Transition.getVendorPropertyName = function (prop) {

    if (Transition.cache[prop] !== undefined) {
      return Transition.cache[prop];
    }

    var div = document.createElement('div');

    // Handle unprefixed versions (FF16+, for example)
    if (prop in div.style) {
      Transition.cache[prop] = prop;
    }
    else {
      var prefixes = ['Moz', 'Webkit', 'O', 'ms'];
      var prop_ = prop.charAt(0).toUpperCase() + prop.substr(1);

      if (prop in div.style) {
        Transition.cache[prop] = prop;
      }
      else {
        for (var i = 0; i < prefixes.length; ++i) {
          var vendorProp = prefixes[i] + prop_;
          if (vendorProp in div.style) {
            Transition.cache[prop] = vendorProp;
            break;
          }
        }
      }
    }

    return Transition.cache[prop];
  };

  /**
   * Get the name of the transition end event
   *
   * @static
   * @private
   * @return {string}  description
   */
  Transition.getTransitionEndEventName = function () {
    return Transition.transitionEndEventNames[Transition.getVendorPropertyName('transition')] || undefined;
  };

  /**
   * Helper function for listening on transition end events
   *
   * @function H5P.Transition.onTransitionEnd
   * @static
   * @param  {domElement} $element The element which is transitioned
   * @param  {function} callback The callback to be invoked when transition is finished
   * @param  {number} timeout  Timeout in milliseconds. Fallback if transition event is never fired
   */
  Transition.onTransitionEnd = function ($element, callback, timeout) {
    // Fallback on 1 second if transition event is not supported/triggered
    timeout = timeout || 1000;
    Transition.transitionEndEventName = Transition.transitionEndEventName || Transition.getTransitionEndEventName();
    var callbackCalled = false;

    var doCallback = function () {
      if (callbackCalled) {
        return;
      }
      $element.off(Transition.transitionEndEventName, callback);
      callbackCalled = true;
      clearTimeout(timer);
      callback();
    };

    var timer = setTimeout(function () {
      doCallback();
    }, timeout);

    $element.on(Transition.transitionEndEventName, function () {
      doCallback();
    });
  };

  /**
   * Wait for a transition - when finished, invokes next in line
   *
   * @private
   *
   * @param {Object[]}    transitions             Array of transitions
   * @param {H5P.jQuery}  transitions[].$element  Dom element transition is performed on
   * @param {number=}     transitions[].timeout   Timeout fallback if transition end never is triggered
   * @param {bool=}       transitions[].break     If true, sequence breaks after this transition
   * @param {number}      index                   The index for current transition
   */
  var runSequence = function (transitions, index) {
    if (index >= transitions.length) {
      return;
    }

    var transition = transitions[index];
    H5P.Transition.onTransitionEnd(transition.$element, function () {
      if (transition.end) {
        transition.end();
      }
      if (transition.break !== true) {
        runSequence(transitions, index+1);
      }
    }, transition.timeout || undefined);
  };

  /**
   * Run a sequence of transitions
   *
   * @function H5P.Transition.sequence
   * @static
   * @param {Object[]}    transitions             Array of transitions
   * @param {H5P.jQuery}  transitions[].$element  Dom element transition is performed on
   * @param {number=}     transitions[].timeout   Timeout fallback if transition end never is triggered
   * @param {bool=}       transitions[].break     If true, sequence breaks after this transition
   */
  Transition.sequence = function (transitions) {
    runSequence(transitions, 0);
  };

  return Transition;
})(H5P.jQuery);
;var H5P = H5P || {};

/**
 * Class responsible for creating a help text dialog
 */
H5P.JoubelHelpTextDialog = (function ($) {

  var numInstances = 0;
  /**
   * Display a pop-up containing a message.
   *
   * @param {H5P.jQuery}  $container  The container which message dialog will be appended to
   * @param {string}      message     The message
   * @param {string}      closeButtonTitle The title for the close button
   * @return {H5P.jQuery}
   */
  function JoubelHelpTextDialog(header, message, closeButtonTitle) {
    H5P.EventDispatcher.call(this);

    var self = this;

    numInstances++;
    var headerId = 'joubel-help-text-header-' + numInstances;
    var helpTextId = 'joubel-help-text-body-' + numInstances;

    var $helpTextDialogBox = $('<div>', {
      'class': 'joubel-help-text-dialog-box',
      'role': 'dialog',
      'aria-labelledby': headerId,
      'aria-describedby': helpTextId
    });

    $('<div>', {
      'class': 'joubel-help-text-dialog-background'
    }).appendTo($helpTextDialogBox);

    var $helpTextDialogContainer = $('<div>', {
      'class': 'joubel-help-text-dialog-container'
    }).appendTo($helpTextDialogBox);

    $('<div>', {
      'class': 'joubel-help-text-header',
      'id': headerId,
      'role': 'header',
      'html': header
    }).appendTo($helpTextDialogContainer);

    $('<div>', {
      'class': 'joubel-help-text-body',
      'id': helpTextId,
      'html': message,
      'role': 'document',
      'tabindex': 0
    }).appendTo($helpTextDialogContainer);

    var handleClose = function () {
      $helpTextDialogBox.remove();
      self.trigger('closed');
    };

    var $closeButton = $('<div>', {
      'class': 'joubel-help-text-remove',
      'role': 'button',
      'title': closeButtonTitle,
      'tabindex': 1,
      'click': handleClose,
      'keydown': function (event) {
        // 32 - space, 13 - enter
        if ([32, 13].indexOf(event.which) !== -1) {
          event.preventDefault();
          handleClose();
        }
      }
    }).appendTo($helpTextDialogContainer);

    /**
     * Get the DOM element
     * @return {HTMLElement}
     */
    self.getElement = function () {
      return $helpTextDialogBox;
    };

    self.focus = function () {
      $closeButton.focus();
    };
  }

  JoubelHelpTextDialog.prototype = Object.create(H5P.EventDispatcher.prototype);
  JoubelHelpTextDialog.prototype.constructor = JoubelHelpTextDialog;

  return JoubelHelpTextDialog;
}(H5P.jQuery));
;var H5P = H5P || {};

/**
 * Class responsible for creating auto-disappearing dialogs
 */
H5P.JoubelMessageDialog = (function ($) {

  /**
   * Display a pop-up containing a message.
   *
   * @param {H5P.jQuery} $container The container which message dialog will be appended to
   * @param {string} message The message
   * @return {H5P.jQuery}
   */
  function JoubelMessageDialog ($container, message) {
    var timeout;

    var removeDialog = function () {
      $warning.remove();
      clearTimeout(timeout);
      $container.off('click.messageDialog');
    };

    // Create warning popup:
    var $warning = $('<div/>', {
      'class': 'joubel-message-dialog',
      text: message
    }).appendTo($container);

    // Remove after 3 seconds or if user clicks anywhere in $container:
    timeout = setTimeout(removeDialog, 3000);
    $container.on('click.messageDialog', removeDialog);

    return $warning;
  }

  return JoubelMessageDialog;
})(H5P.jQuery);
;var H5P = H5P || {};

/**
 * Class responsible for creating a circular progress bar
 */

H5P.JoubelProgressCircle = (function ($) {

  /**
   * Constructor for the Progress Circle
   *
   * @param {Number} number The amount of progress to display
   * @param {string} progressColor Color for the progress meter
   * @param {string} backgroundColor Color behind the progress meter
   */
  function ProgressCircle(number, progressColor, fillColor, backgroundColor) {
    progressColor = progressColor || '#1a73d9';
    fillColor = fillColor || '#f0f0f0';
    backgroundColor = backgroundColor || '#ffffff';
    var progressColorRGB = this.hexToRgb(progressColor);

    //Verify number
    try {
      number = Number(number);
      if (number === '') {
        throw 'is empty';
      }
      if (isNaN(number)) {
        throw 'is not a number';
      }
    } catch (e) {
      number = 'err';
    }

    //Draw circle
    if (number > 100) {
      number = 100;
    }

    // We can not use rgba, since they will stack on top of each other.
    // Instead we create the equivalent of the rgba color
    // and applies this to the activeborder and background color.
    var progressColorString = 'rgb(' + parseInt(progressColorRGB.r, 10) +
      ',' + parseInt(progressColorRGB.g, 10) +
      ',' + parseInt(progressColorRGB.b, 10) + ')';

    // Circle wrapper
    var $wrapper = $('<div/>', {
      'class': "joubel-progress-circle-wrapper"
    });

    //Active border indicates progress
    var $activeBorder = $('<div/>', {
      'class': "joubel-progress-circle-active-border"
    }).appendTo($wrapper);

    //Background circle
    var $backgroundCircle = $('<div/>', {
      'class': "joubel-progress-circle-circle"
    }).appendTo($activeBorder);

    //Progress text/number
    $('<span/>', {
      'text': number + '%',
      'class': "joubel-progress-circle-percentage"
    }).appendTo($backgroundCircle);

    var deg = number * 3.6;
    if (deg <= 180) {
      $activeBorder.css('background-image',
        'linear-gradient(' + (90 + deg) + 'deg, transparent 50%, ' + fillColor + ' 50%),' +
        'linear-gradient(90deg, ' + fillColor + ' 50%, transparent 50%)')
        .css('border', '2px solid' + backgroundColor)
        .css('background-color', progressColorString);
    } else {
      $activeBorder.css('background-image',
        'linear-gradient(' + (deg - 90) + 'deg, transparent 50%, ' + progressColorString + ' 50%),' +
        'linear-gradient(90deg, ' + fillColor + ' 50%, transparent 50%)')
        .css('border', '2px solid' + backgroundColor)
        .css('background-color', progressColorString);
    }

    this.$activeBorder = $activeBorder;
    this.$backgroundCircle = $backgroundCircle;
    this.$wrapper = $wrapper;

    this.initResizeFunctionality();

    return $wrapper;
  }

  /**
   * Initializes resize functionality for the progress circle
   */
  ProgressCircle.prototype.initResizeFunctionality = function () {
    var self = this;

    $(window).resize(function () {
      // Queue resize
      setTimeout(function () {
        self.resize();
      });
    });

    // First resize
    setTimeout(function () {
      self.resize();
    }, 0);
  };

  /**
   * Resize function makes progress circle grow or shrink relative to parent container
   */
  ProgressCircle.prototype.resize = function () {
    var $parent = this.$wrapper.parent();

    if ($parent !== undefined && $parent) {

      // Measurements
      var fontSize = parseInt($parent.css('font-size'), 10);

      // Static sizes
      var fontSizeMultiplum = 3.75;
      var progressCircleWidthPx = parseInt((fontSize / 4.5), 10) % 2 === 0 ? parseInt((fontSize / 4.5), 10) + 4 : parseInt((fontSize / 4.5), 10) + 5;
      var progressCircleOffset = progressCircleWidthPx / 2;

      var width = fontSize * fontSizeMultiplum;
      var height = fontSize * fontSizeMultiplum;
      this.$activeBorder.css({
        'width': width,
        'height': height
      });

      this.$backgroundCircle.css({
        'width': width - progressCircleWidthPx,
        'height': height - progressCircleWidthPx,
        'top': progressCircleOffset,
        'left': progressCircleOffset
      });
    }
  };

  /**
   * Hex to RGB conversion
   * @param hex
   * @returns {{r: Number, g: Number, b: Number}}
   */
  ProgressCircle.prototype.hexToRgb = function (hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  return ProgressCircle;

}(H5P.jQuery));
;var H5P = H5P || {};

H5P.SimpleRoundedButton = (function ($) {

  /**
   * Creates a new tip
   */
  function SimpleRoundedButton(text) {

    var $simpleRoundedButton = $('<div>', {
      'class': 'joubel-simple-rounded-button',
      'title': text,
      'role': 'button',
      'tabindex': '0'
    }).keydown(function (e) {
      // 32 - space, 13 - enter
      if ([32, 13].indexOf(e.which) !== -1) {
        $(this).click();
        e.preventDefault();
      }
    });

    $('<span>', {
      'class': 'joubel-simple-rounded-button-text',
      'html': text
    }).appendTo($simpleRoundedButton);

    return $simpleRoundedButton;
  }

  return SimpleRoundedButton;
}(H5P.jQuery));
;var H5P = H5P || {};

/**
 * Class responsible for creating speech bubbles
 */
H5P.JoubelSpeechBubble = (function ($) {

  var $currentSpeechBubble;
  var $currentContainer;  
  var $tail;
  var $innerTail;
  var removeSpeechBubbleTimeout;
  var currentMaxWidth;

  var DEFAULT_MAX_WIDTH = 400;

  var iDevice = navigator.userAgent.match(/iPod|iPhone|iPad/g) ? true : false;

  /**
   * Creates a new speech bubble
   *
   * @param {H5P.jQuery} $container The speaking object
   * @param {string} text The text to display
   * @param {number} maxWidth The maximum width of the bubble
   * @return {H5P.JoubelSpeechBubble}
   */
  function JoubelSpeechBubble($container, text, maxWidth) {
    maxWidth = maxWidth || DEFAULT_MAX_WIDTH;
    currentMaxWidth = maxWidth;
    $currentContainer = $container;

    this.isCurrent = function ($tip) {
      return $tip.is($currentContainer);
    };

    this.remove = function () {
      remove();
    };

    var fadeOutSpeechBubble = function ($speechBubble) {
      if (!$speechBubble) {
        return;
      }

      // Stop removing bubble
      clearTimeout(removeSpeechBubbleTimeout);

      $speechBubble.removeClass('show');
      setTimeout(function () {
        if ($speechBubble) {
          $speechBubble.remove();
          $speechBubble = undefined;
        }
      }, 500);
    };

    if ($currentSpeechBubble !== undefined) {
      remove();
    }

    var $h5pContainer = getH5PContainer($container);

    // Make sure we fade out old speech bubble
    fadeOutSpeechBubble($currentSpeechBubble);

    // Create bubble
    $tail = $('<div class="joubel-speech-bubble-tail"></div>');
    $innerTail = $('<div class="joubel-speech-bubble-inner-tail"></div>');
    var $innerBubble = $(
      '<div class="joubel-speech-bubble-inner">' +
      '<div class="joubel-speech-bubble-text">' + text + '</div>' +
      '</div>'
    ).prepend($innerTail);

    $currentSpeechBubble = $(
      '<div class="joubel-speech-bubble" aria-live="assertive">'
    ).append([$tail, $innerBubble])
      .appendTo($h5pContainer);

    // Show speech bubble with transition
    setTimeout(function () {
      $currentSpeechBubble.addClass('show');
    }, 0);

    position($currentSpeechBubble, $currentContainer, maxWidth, $tail, $innerTail);

    // Handle click to close
    H5P.$body.on('mousedown.speechBubble', handleOutsideClick);

    // Handle window resizing
    H5P.$window.on('resize', '', handleResize);

    // Handle clicks when inside IV which blocks bubbling.
    $container.parents('.h5p-dialog')
      .on('mousedown.speechBubble', handleOutsideClick);

    if (iDevice) {
      H5P.$body.css('cursor', 'pointer');
    }

    return this;
  }

  // Remove speechbubble if it belongs to a dom element that is about to be hidden
  H5P.externalDispatcher.on('domHidden', function (event) {
    if ($currentSpeechBubble !== undefined && event.data.$dom.find($currentContainer).length !== 0) {
      remove();
    }
  });

  /**
   * Returns the closest h5p container for the given DOM element.
   * 
   * @param {object} $container jquery element
   * @return {object} the h5p container (jquery element)
   */
  function getH5PContainer($container) {
    var $h5pContainer = $container.closest('.h5p-frame');

    // Check closest h5p frame first, then check for container in case there is no frame.
    if (!$h5pContainer.length) {
      $h5pContainer = $container.closest('.h5p-container');
    }

    return $h5pContainer;
  }

  /**
   * Event handler that is called when the window is resized.
   */
  function handleResize() {
    position($currentSpeechBubble, $currentContainer, currentMaxWidth, $tail, $innerTail);
  }

  /**
   * Repositions the speech bubble according to the position of the container.
   * 
   * @param {object} $currentSpeechbubble the speech bubble that should be positioned   
   * @param {object} $container the container to which the speech bubble should point 
   * @param {number} maxWidth the maximum width of the speech bubble
   * @param {object} $tail the tail (the triangle that points to the referenced container)
   * @param {object} $innerTail the inner tail (the triangle that points to the referenced container)
   */
  function position($currentSpeechBubble, $container, maxWidth, $tail, $innerTail) {
    var $h5pContainer = getH5PContainer($container);

    // Calculate offset between the button and the h5p frame
    var offset = getOffsetBetween($h5pContainer, $container);

    var direction = (offset.bottom > offset.top ? 'bottom' : 'top');
    var tipWidth = offset.outerWidth * 0.9; // Var needs to be renamed to make sense
    var bubbleWidth = tipWidth > maxWidth ? maxWidth : tipWidth;

    var bubblePosition = getBubblePosition(bubbleWidth, offset);
    var tailPosition = getTailPosition(bubbleWidth, bubblePosition, offset, $container.width());
    // Need to set font-size, since element is appended to body.
    // Using same font-size as parent. In that way it will grow accordingly
    // when resizing
    var fontSize = 16;//parseFloat($parent.css('font-size'));

    // Set width and position of speech bubble
    $currentSpeechBubble.css(bubbleCSS(
      direction,
      bubbleWidth,
      bubblePosition,
      fontSize
    ));

    var preparedTailCSS = tailCSS(direction, tailPosition);
    $tail.css(preparedTailCSS);
    $innerTail.css(preparedTailCSS);
  }

  /**
   * Static function for removing the speechbubble
   */
  var remove = function () {
    H5P.$body.off('mousedown.speechBubble');
    H5P.$window.off('resize', '', handleResize);
    $currentContainer.parents('.h5p-dialog').off('mousedown.speechBubble');
    if (iDevice) {
      H5P.$body.css('cursor', '');
    }
    if ($currentSpeechBubble !== undefined) {
      // Apply transition, then remove speech bubble
      $currentSpeechBubble.removeClass('show');

      // Make sure we remove any old timeout before reassignment
      clearTimeout(removeSpeechBubbleTimeout);
      removeSpeechBubbleTimeout = setTimeout(function () {
        $currentSpeechBubble.remove();
        $currentSpeechBubble = undefined;
      }, 500);
    }
    // Don't return false here. If the user e.g. clicks a button when the bubble is visible,
    // we want the bubble to disapear AND the button to receive the event
  };

  /**
   * Remove the speech bubble and container reference
   */
  function handleOutsideClick(event) {
    if (event.target === $currentContainer[0]) {
      return; // Button clicks are not outside clicks
    }

    remove();
    // There is no current container when a container isn't clicked
    $currentContainer = undefined;
  }

  /**
   * Calculate position for speech bubble
   *
   * @param {number} bubbleWidth The width of the speech bubble
   * @param {object} offset
   * @return {object} Return position for the speech bubble
   */
  function getBubblePosition(bubbleWidth, offset) {
    var bubblePosition = {};

    var tailOffset = 9;
    var widthOffset = bubbleWidth / 2;

    // Calculate top position
    bubblePosition.top = offset.top + offset.innerHeight;

    // Calculate bottom position
    bubblePosition.bottom = offset.bottom + offset.innerHeight + tailOffset;

    // Calculate left position
    if (offset.left < widthOffset) {
      bubblePosition.left = 3;
    }
    else if ((offset.left + widthOffset) > offset.outerWidth) {
      bubblePosition.left = offset.outerWidth - bubbleWidth - 3;
    }
    else {
      bubblePosition.left = offset.left - widthOffset + (offset.innerWidth / 2);
    }

    return bubblePosition;
  }

  /**
   * Calculate position for speech bubble tail
   *
   * @param {number} bubbleWidth The width of the speech bubble
   * @param {object} bubblePosition Speech bubble position
   * @param {object} offset
   * @param {number} iconWidth The width of the tip icon
   * @return {object} Return position for the tail
   */
  function getTailPosition(bubbleWidth, bubblePosition, offset, iconWidth) {
    var tailPosition = {};
    // Magic numbers. Tuned by hand so that the tail fits visually within
    // the bounds of the speech bubble.
    var leftBoundary = 9;
    var rightBoundary = bubbleWidth - 20;

    tailPosition.left = offset.left - bubblePosition.left + (iconWidth / 2) - 6;
    if (tailPosition.left < leftBoundary) {
      tailPosition.left = leftBoundary;
    }
    if (tailPosition.left > rightBoundary) {
      tailPosition.left = rightBoundary;
    }

    tailPosition.top = -6;
    tailPosition.bottom = -6;

    return tailPosition;
  }

  /**
   * Return bubble CSS for the desired growth direction
   *
   * @param {string} direction The direction the speech bubble will grow
   * @param {number} width The width of the speech bubble
   * @param {object} position Speech bubble position
   * @param {number} fontSize The size of the bubbles font
   * @return {object} Return CSS
   */
  function bubbleCSS(direction, width, position, fontSize) {
    if (direction === 'top') {
      return {
        width: width + 'px',
        bottom: position.bottom + 'px',
        left: position.left + 'px',
        fontSize: fontSize + 'px',
        top: ''
      };
    }
    else {
      return {
        width: width + 'px',
        top: position.top + 'px',
        left: position.left + 'px',
        fontSize: fontSize + 'px',
        bottom: ''
      };
    }
  }

  /**
   * Return tail CSS for the desired growth direction
   *
   * @param {string} direction The direction the speech bubble will grow
   * @param {object} position Tail position
   * @return {object} Return CSS
   */
  function tailCSS(direction, position) {
    if (direction === 'top') {
      return {
        bottom: position.bottom + 'px',
        left: position.left + 'px',
        top: ''
      };
    }
    else {
      return {
        top: position.top + 'px',
        left: position.left + 'px',
        bottom: ''
      };
    }
  }

  /**
   * Calculates the offset between an element inside a container and the
   * container. Only works if all the edges of the inner element are inside the
   * outer element.
   * Width/height of the elements is included as a convenience.
   *
   * @param {H5P.jQuery} $outer
   * @param {H5P.jQuery} $inner
   * @return {object} Position offset
   */
  function getOffsetBetween($outer, $inner) {
    var outer = $outer[0].getBoundingClientRect();
    var inner = $inner[0].getBoundingClientRect();

    return {
      top: inner.top - outer.top,
      right: outer.right - inner.right,
      bottom: outer.bottom - inner.bottom,
      left: inner.left - outer.left,
      innerWidth: inner.width,
      innerHeight: inner.height,
      outerWidth: outer.width,
      outerHeight: outer.height
    };
  }

  return JoubelSpeechBubble;
})(H5P.jQuery);
;var H5P = H5P || {};

H5P.JoubelThrobber = (function ($) {

  /**
   * Creates a new tip
   */
  function JoubelThrobber() {

    // h5p-throbber css is described in core
    var $throbber = $('<div/>', {
      'class': 'h5p-throbber'
    });

    return $throbber;
  }

  return JoubelThrobber;
}(H5P.jQuery));
;H5P.JoubelTip = (function ($) {
  var $conv = $('<div/>');

  /**
   * Creates a new tip element.
   *
   * NOTE that this may look like a class but it doesn't behave like one.
   * It returns a jQuery object.
   *
   * @param {string} tipHtml The text to display in the popup
   * @param {Object} [behaviour] Options
   * @param {string} [behaviour.tipLabel] Set to use a custom label for the tip button (you want this for good A11Y)
   * @param {boolean} [behaviour.helpIcon] Set to 'true' to Add help-icon classname to Tip button (changes the icon)
   * @param {boolean} [behaviour.showSpeechBubble] Set to 'false' to disable functionality (you may this in the editor)
   * @param {boolean} [behaviour.tabcontrol] Set to 'true' if you plan on controlling the tabindex in the parent (tabindex="-1")
   * @return {H5P.jQuery|undefined} Tip button jQuery element or 'undefined' if invalid tip
   */
  function JoubelTip(tipHtml, behaviour) {

    // Keep track of the popup that appears when you click the Tip button
    var speechBubble;

    // Parse tip html to determine text
    var tipText = $conv.html(tipHtml).text().trim();
    if (tipText === '') {
      return; // The tip has no textual content, i.e. it's invalid.
    }

    // Set default behaviour
    behaviour = $.extend({
      tipLabel: tipText,
      helpIcon: false,
      showSpeechBubble: true,
      tabcontrol: false
    }, behaviour);

    // Create Tip button
    var $tipButton = $('<div/>', {
      class: 'joubel-tip-container' + (behaviour.showSpeechBubble ? '' : ' be-quiet'),
      'aria-label': behaviour.tipLabel,
      'aria-expanded': false,
      role: 'button',
      tabindex: (behaviour.tabcontrol ? -1 : 0),
      click: function (event) {
        // Toggle show/hide popup
        toggleSpeechBubble();
        event.preventDefault();
      },
      keydown: function (event) {
        if (event.which === 32 || event.which === 13) { // Space & enter key
          // Toggle show/hide popup
          toggleSpeechBubble();
          event.stopPropagation();
          event.preventDefault();
        }
        else { // Any other key
          // Toggle hide popup
          toggleSpeechBubble(false);
        }
      },
      // Add markup to render icon
      html: '<span class="joubel-icon-tip-normal ' + (behaviour.helpIcon ? ' help-icon': '') + '">' +
              '<span class="h5p-icon-shadow"></span>' +
              '<span class="h5p-icon-speech-bubble"></span>' +
              '<span class="h5p-icon-info"></span>' +
            '</span>'
      // IMPORTANT: All of the markup elements must have 'pointer-events: none;'
    });

    const $tipAnnouncer = $('<div>', {
      'class': 'hidden-but-read',
      'aria-live': 'polite',
      appendTo: $tipButton,
    });

    /**
     * Tip button interaction handler.
     * Toggle show or hide the speech bubble popup when interacting with the
     * Tip button.
     *
     * @private
     * @param {boolean} [force] 'true' shows and 'false' hides.
     */
    var toggleSpeechBubble = function (force) {
      if (speechBubble !== undefined && speechBubble.isCurrent($tipButton)) {
        // Hide current popup
        speechBubble.remove();
        speechBubble = undefined;

        $tipButton.attr('aria-expanded', false);
        $tipAnnouncer.html('');
      }
      else if (force !== false && behaviour.showSpeechBubble) {
        // Create and show new popup
        speechBubble = H5P.JoubelSpeechBubble($tipButton, tipHtml);
        $tipButton.attr('aria-expanded', true);
        $tipAnnouncer.html(tipHtml);
      }
    };

    return $tipButton;
  }

  return JoubelTip;
})(H5P.jQuery);
;var H5P = H5P || {};

H5P.JoubelSlider = (function ($) {

  /**
   * Creates a new Slider
   *
   * @param {object} [params] Additional parameters
   */
  function JoubelSlider(params) {
    H5P.EventDispatcher.call(this);

    this.$slider = $('<div>', $.extend({
      'class': 'h5p-joubel-ui-slider'
    }, params));

    this.$slides = [];
    this.currentIndex = 0;
    this.numSlides = 0;
  }
  JoubelSlider.prototype = Object.create(H5P.EventDispatcher.prototype);
  JoubelSlider.prototype.constructor = JoubelSlider;

  JoubelSlider.prototype.addSlide = function ($content) {
    $content.addClass('h5p-joubel-ui-slide').css({
      'left': (this.numSlides*100) + '%'
    });
    this.$slider.append($content);
    this.$slides.push($content);

    this.numSlides++;

    if(this.numSlides === 1) {
      $content.addClass('current');
    }
  };

  JoubelSlider.prototype.attach = function ($container) {
    $container.append(this.$slider);
  };

  JoubelSlider.prototype.move = function (index) {
    var self = this;

    if(index === 0) {
      self.trigger('first-slide');
    }
    if(index+1 === self.numSlides) {
      self.trigger('last-slide');
    }
    self.trigger('move');

    var $previousSlide = self.$slides[this.currentIndex];
    H5P.Transition.onTransitionEnd(this.$slider, function () {
      $previousSlide.removeClass('current');
      self.trigger('moved');
    });
    this.$slides[index].addClass('current');

    var translateX = 'translateX(' + (-index*100) + '%)';
    this.$slider.css({
      '-webkit-transform': translateX,
      '-moz-transform': translateX,
      '-ms-transform': translateX,
      'transform': translateX
    });

    this.currentIndex = index;
  };

  JoubelSlider.prototype.remove = function () {
    this.$slider.remove();
  };

  JoubelSlider.prototype.next = function () {
    if(this.currentIndex+1 >= this.numSlides) {
      return;
    }

    this.move(this.currentIndex+1);
  };

  JoubelSlider.prototype.previous = function () {
    this.move(this.currentIndex-1);
  };

  JoubelSlider.prototype.first = function () {
    this.move(0);
  };

  JoubelSlider.prototype.last = function () {
    this.move(this.numSlides-1);
  };

  return JoubelSlider;
})(H5P.jQuery);
;var H5P = H5P || {};

/**
 * @module
 */
H5P.JoubelScoreBar = (function ($) {

  /* Need to use an id for the star SVG since that is the only way to reference
     SVG filters  */
  var idCounter = 0;

  /**
   * Creates a score bar
   * @class H5P.JoubelScoreBar
   * @param {number} maxScore  Maximum score
   * @param {string} [label] Makes it easier for readspeakers to identify the scorebar
   * @param {string} [helpText] Score explanation
   * @param {string} [scoreExplanationButtonLabel] Label for score explanation button
   */
  function JoubelScoreBar(maxScore, label, helpText, scoreExplanationButtonLabel) {
    var self = this;

    self.maxScore = maxScore;
    self.score = 0;
    idCounter++;

    /**
     * @const {string}
     */
    self.STAR_MARKUP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63.77 53.87" aria-hidden="true" focusable="false">' +
        '<title>star</title>' +
        '<filter id="h5p-joubelui-score-bar-star-inner-shadow-' + idCounter + '" x0="-50%" y0="-50%" width="200%" height="200%">' +
          '<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"></feGaussianBlur>' +
          '<feOffset dy="2" dx="4"></feOffset>' +
          '<feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff"></feComposite>' +
          '<feFlood flood-color="#ffe95c" flood-opacity="1"></feFlood>' +
          '<feComposite in2="shadowDiff" operator="in"></feComposite>' +
          '<feComposite in2="SourceGraphic" operator="over" result="firstfilter"></feComposite>' +
          '<feGaussianBlur in="firstfilter" stdDeviation="3" result="blur2"></feGaussianBlur>' +
          '<feOffset dy="-2" dx="-4"></feOffset>' +
          '<feComposite in2="firstfilter" operator="arithmetic" k2="-1" k3="1" result="shadowDiff"></feComposite>' +
          '<feFlood flood-color="#ffe95c" flood-opacity="1"></feFlood>' +
          '<feComposite in2="shadowDiff" operator="in"></feComposite>' +
          '<feComposite in2="firstfilter" operator="over"></feComposite>' +
        '</filter>' +
        '<path class="h5p-joubelui-score-bar-star-shadow" d="M35.08,43.41V9.16H20.91v0L9.51,10.85,9,10.93C2.8,12.18,0,17,0,21.25a11.22,11.22,0,0,0,3,7.48l8.73,8.53-1.07,6.16Z"/>' +
        '<g>' +
          '<path class="h5p-joubelui-score-bar-star-border" d="M61.36,22.8,49.72,34.11l2.78,16a2.6,2.6,0,0,1,.05.64c0,.85-.37,1.6-1.33,1.6A2.74,2.74,0,0,1,49.94,52L35.58,44.41,21.22,52a2.93,2.93,0,0,1-1.28.37c-.91,0-1.33-.75-1.33-1.6,0-.21.05-.43.05-.64l2.78-16L9.8,22.8A2.57,2.57,0,0,1,9,21.25c0-1,1-1.33,1.81-1.49l16.07-2.35L34.09,2.83c.27-.59.85-1.33,1.55-1.33s1.28.69,1.55,1.33l7.21,14.57,16.07,2.35c.75.11,1.81.53,1.81,1.49A3.07,3.07,0,0,1,61.36,22.8Z"/>' +
          '<path class="h5p-joubelui-score-bar-star-fill" d="M61.36,22.8,49.72,34.11l2.78,16a2.6,2.6,0,0,1,.05.64c0,.85-.37,1.6-1.33,1.6A2.74,2.74,0,0,1,49.94,52L35.58,44.41,21.22,52a2.93,2.93,0,0,1-1.28.37c-.91,0-1.33-.75-1.33-1.6,0-.21.05-.43.05-.64l2.78-16L9.8,22.8A2.57,2.57,0,0,1,9,21.25c0-1,1-1.33,1.81-1.49l16.07-2.35L34.09,2.83c.27-.59.85-1.33,1.55-1.33s1.28.69,1.55,1.33l7.21,14.57,16.07,2.35c.75.11,1.81.53,1.81,1.49A3.07,3.07,0,0,1,61.36,22.8Z"/>' +
          '<path filter="url(#h5p-joubelui-score-bar-star-inner-shadow-' + idCounter + ')" class="h5p-joubelui-score-bar-star-fill-full-score" d="M61.36,22.8,49.72,34.11l2.78,16a2.6,2.6,0,0,1,.05.64c0,.85-.37,1.6-1.33,1.6A2.74,2.74,0,0,1,49.94,52L35.58,44.41,21.22,52a2.93,2.93,0,0,1-1.28.37c-.91,0-1.33-.75-1.33-1.6,0-.21.05-.43.05-.64l2.78-16L9.8,22.8A2.57,2.57,0,0,1,9,21.25c0-1,1-1.33,1.81-1.49l16.07-2.35L34.09,2.83c.27-.59.85-1.33,1.55-1.33s1.28.69,1.55,1.33l7.21,14.57,16.07,2.35c.75.11,1.81.53,1.81,1.49A3.07,3.07,0,0,1,61.36,22.8Z"/>' +
        '</g>' +
      '</svg>';

    /**
     * @function appendTo
     * @memberOf H5P.JoubelScoreBar#
     * @param {H5P.jQuery}  $wrapper  Dom container
     */
    self.appendTo = function ($wrapper) {
      self.$scoreBar.appendTo($wrapper);
    };

    /**
     * Create the text representation of the scorebar .
     *
     * @private
     * @return {string}
     */
    var createLabel = function (score) {
      if (!label) {
        return '';
      }

      return label.replace(':num', score).replace(':total', self.maxScore);
    };

    /**
     * Creates the html for this widget
     *
     * @method createHtml
     * @private
     */
    var createHtml = function () {
      // Container div
      self.$scoreBar = $('<div>', {
        'class': 'h5p-joubelui-score-bar',
      });

      var $visuals = $('<div>', {
        'class': 'h5p-joubelui-score-bar-visuals',
        appendTo: self.$scoreBar
      });

      // The progress bar wrapper
      self.$progressWrapper = $('<div>', {
        'class': 'h5p-joubelui-score-bar-progress-wrapper',
        appendTo: $visuals
      });

      self.$progress = $('<div>', {
        'class': 'h5p-joubelui-score-bar-progress',
        'html': createLabel(self.score),
        appendTo: self.$progressWrapper
      });

      // The star
      $('<div>', {
        'class': 'h5p-joubelui-score-bar-star',
        html: self.STAR_MARKUP
      }).appendTo($visuals);

      // The score container
      var $numerics = $('<div>', {
        'class': 'h5p-joubelui-score-numeric',
        appendTo: self.$scoreBar,
        'aria-hidden': true
      });

      // The current score
      self.$scoreCounter = $('<span>', {
        'class': 'h5p-joubelui-score-number h5p-joubelui-score-number-counter',
        text: 0,
        appendTo: $numerics
      });

      // The separator
      $('<span>', {
        'class': 'h5p-joubelui-score-number-separator',
        text: '/',
        appendTo: $numerics
      });

      // Max score
      self.$maxScore = $('<span>', {
        'class': 'h5p-joubelui-score-number h5p-joubelui-score-max',
        text: self.maxScore,
        appendTo: $numerics
      });

      if (helpText) {
        H5P.JoubelUI.createTip(helpText, {
          tipLabel: scoreExplanationButtonLabel ? scoreExplanationButtonLabel : helpText,
          helpIcon: true
        }).appendTo(self.$scoreBar);
        self.$scoreBar.addClass('h5p-score-bar-has-help');
      }
    };

    /**
     * Set the current score
     * @method setScore
     * @memberOf H5P.JoubelScoreBar#
     * @param  {number} score
     */
    self.setScore = function (score) {
      // Do nothing if score hasn't changed
      if (score === self.score) {
        return;
      }
      self.score = score > self.maxScore ? self.maxScore : score;
      self.updateVisuals();
    };

    /**
     * Increment score
     * @method incrementScore
     * @memberOf H5P.JoubelScoreBar#
     * @param  {number=}        incrementBy Optional parameter, defaults to 1
     */
    self.incrementScore = function (incrementBy) {
      self.setScore(self.score + (incrementBy || 1));
    };

    /**
     * Set the max score
     * @method setMaxScore
     * @memberOf H5P.JoubelScoreBar#
     * @param  {number}    maxScore The max score
     */
    self.setMaxScore = function (maxScore) {
      self.maxScore = maxScore;
    };

    /**
     * Updates the progressbar visuals
     * @memberOf H5P.JoubelScoreBar#
     * @method updateVisuals
     */
    self.updateVisuals = function () {
      self.$progress.html(createLabel(self.score));
      self.$scoreCounter.text(self.score);
      self.$maxScore.text(self.maxScore);

      setTimeout(function () {
        // Start the progressbar animation
        self.$progress.css({
          width: ((self.score / self.maxScore) * 100) + '%'
        });

        H5P.Transition.onTransitionEnd(self.$progress, function () {
          // If fullscore fill the star and start the animation
          self.$scoreBar.toggleClass('h5p-joubelui-score-bar-full-score', self.score === self.maxScore);
          self.$scoreBar.toggleClass('h5p-joubelui-score-bar-animation-active', self.score === self.maxScore);

          // Only allow the star animation to run once
          self.$scoreBar.one("animationend", function() {
            self.$scoreBar.removeClass("h5p-joubelui-score-bar-animation-active");
          });
        }, 600);
      }, 300);
    };

    /**
     * Removes all classes
     * @method reset
     */
    self.reset = function () {
      self.$scoreBar.removeClass('h5p-joubelui-score-bar-full-score');
    };

    createHtml();
  }

  return JoubelScoreBar;
})(H5P.jQuery);
;var H5P = H5P || {};

H5P.JoubelProgressbar = (function ($) {

  /**
   * Joubel progressbar class
   * @method JoubelProgressbar
   * @constructor
   * @param  {number}          steps Number of steps
   * @param {Object} [options] Additional options
   * @param {boolean} [options.disableAria] Disable readspeaker assistance
   * @param {string} [options.progressText] A progress text for describing
   *  current progress out of total progress for readspeakers.
   *  e.g. "Slide :num of :total"
   */
  function JoubelProgressbar(steps, options) {
    H5P.EventDispatcher.call(this);
    var self = this;
    this.options = $.extend({
      progressText: 'Slide :num of :total'
    }, options);
    this.currentStep = 0;
    this.steps = steps;

    this.$progressbar = $('<div>', {
      'class': 'h5p-joubelui-progressbar'
    });
    this.$background = $('<div>', {
      'class': 'h5p-joubelui-progressbar-background'
    }).appendTo(this.$progressbar);
  }

  JoubelProgressbar.prototype = Object.create(H5P.EventDispatcher.prototype);
  JoubelProgressbar.prototype.constructor = JoubelProgressbar;

  JoubelProgressbar.prototype.updateAria = function () {
    var self = this;
    if (this.options.disableAria) {
      return;
    }

    if (!this.$currentStatus) {
      this.$currentStatus = $('<div>', {
        'class': 'h5p-joubelui-progressbar-slide-status-text',
        'aria-live': 'assertive'
      }).appendTo(this.$progressbar);
    }
    var interpolatedProgressText = self.options.progressText
      .replace(':num', self.currentStep)
      .replace(':total', self.steps);
    this.$currentStatus.html(interpolatedProgressText);
  };

  /**
   * Appends to a container
   * @method appendTo
   * @param  {H5P.jquery} $container
   */
  JoubelProgressbar.prototype.appendTo = function ($container) {
    this.$progressbar.appendTo($container);
  };

  /**
   * Update progress
   * @method setProgress
   * @param  {number}    step
   */
  JoubelProgressbar.prototype.setProgress = function (step) {
    // Check for valid value:
    if (step > this.steps || step < 0) {
      return;
    }
    this.currentStep = step;
    this.$background.css({
      width: ((this.currentStep/this.steps)*100) + '%'
    });

    this.updateAria();
  };

  /**
   * Increment progress with 1
   * @method next
   */
  JoubelProgressbar.prototype.next = function () {
    this.setProgress(this.currentStep+1);
  };

  /**
   * Reset progressbar
   * @method reset
   */
  JoubelProgressbar.prototype.reset = function () {
    this.setProgress(0);
  };

  /**
   * Check if last step is reached
   * @method isLastStep
   * @return {Boolean}
   */
  JoubelProgressbar.prototype.isLastStep = function () {
    return this.steps === this.currentStep;
  };

  return JoubelProgressbar;
})(H5P.jQuery);
;var H5P = H5P || {};

/**
 * H5P Joubel UI library.
 *
 * This is a utility library, which does not implement attach. I.e, it has to bee actively used by
 * other libraries
 * @module
 */
H5P.JoubelUI = (function ($) {

  /**
   * The internal object to return
   * @class H5P.JoubelUI
   * @static
   */
  function JoubelUI() {}

  /* Public static functions */

  /**
   * Create a tip icon
   * @method H5P.JoubelUI.createTip
   * @param  {string}  text   The textual tip
   * @param  {Object}  params Parameters
   * @return {H5P.JoubelTip}
   */
  JoubelUI.createTip = function (text, params) {
    return new H5P.JoubelTip(text, params);
  };

  /**
   * Create message dialog
   * @method H5P.JoubelUI.createMessageDialog
   * @param  {H5P.jQuery}               $container The dom container
   * @param  {string}                   message    The message
   * @return {H5P.JoubelMessageDialog}
   */
  JoubelUI.createMessageDialog = function ($container, message) {
    return new H5P.JoubelMessageDialog($container, message);
  };

  /**
   * Create help text dialog
   * @method H5P.JoubelUI.createHelpTextDialog
   * @param  {string}             header  The textual header
   * @param  {string}             message The textual message
   * @param  {string}             closeButtonTitle The title for the close button
   * @return {H5P.JoubelHelpTextDialog}
   */
  JoubelUI.createHelpTextDialog = function (header, message, closeButtonTitle) {
    return new H5P.JoubelHelpTextDialog(header, message, closeButtonTitle);
  };

  /**
   * Create progress circle
   * @method H5P.JoubelUI.createProgressCircle
   * @param  {number}             number          The progress (0 to 100)
   * @param  {string}             progressColor   The progress color in hex value
   * @param  {string}             fillColor       The fill color in hex value
   * @param  {string}             backgroundColor The background color in hex value
   * @return {H5P.JoubelProgressCircle}
   */
  JoubelUI.createProgressCircle = function (number, progressColor, fillColor, backgroundColor) {
    return new H5P.JoubelProgressCircle(number, progressColor, fillColor, backgroundColor);
  };

  /**
   * Create throbber for loading
   * @method H5P.JoubelUI.createThrobber
   * @return {H5P.JoubelThrobber}
   */
  JoubelUI.createThrobber = function () {
    return new H5P.JoubelThrobber();
  };

  /**
   * Create simple rounded button
   * @method H5P.JoubelUI.createSimpleRoundedButton
   * @param  {string}                  text The button label
   * @return {H5P.SimpleRoundedButton}
   */
  JoubelUI.createSimpleRoundedButton = function (text) {
    return new H5P.SimpleRoundedButton(text);
  };

  /**
   * Create Slider
   * @method H5P.JoubelUI.createSlider
   * @param  {Object} [params] Parameters
   * @return {H5P.JoubelSlider}
   */
  JoubelUI.createSlider = function (params) {
    return new H5P.JoubelSlider(params);
  };

  /**
   * Create Score Bar
   * @method H5P.JoubelUI.createScoreBar
   * @param  {number=}       maxScore The maximum score
   * @param {string} [label] Makes it easier for readspeakers to identify the scorebar
   * @return {H5P.JoubelScoreBar}
   */
  JoubelUI.createScoreBar = function (maxScore, label, helpText, scoreExplanationButtonLabel) {
    return new H5P.JoubelScoreBar(maxScore, label, helpText, scoreExplanationButtonLabel);
  };

  /**
   * Create Progressbar
   * @method H5P.JoubelUI.createProgressbar
   * @param  {number=}       numSteps The total numer of steps
   * @param {Object} [options] Additional options
   * @param {boolean} [options.disableAria] Disable readspeaker assistance
   * @param {string} [options.progressText] A progress text for describing
   *  current progress out of total progress for readspeakers.
   *  e.g. "Slide :num of :total"
   * @return {H5P.JoubelProgressbar}
   */
  JoubelUI.createProgressbar = function (numSteps, options) {
    return new H5P.JoubelProgressbar(numSteps, options);
  };

  /**
   * Create standard Joubel button
   *
   * @method H5P.JoubelUI.createButton
   * @param {object} params
   *  May hold any properties allowed by jQuery. If href is set, an A tag
   *  is used, if not a button tag is used.
   * @return {H5P.jQuery} The jquery element created
   */
  JoubelUI.createButton = function(params) {
    var type = 'button';
    if (params.href) {
      type = 'a';
    }
    else {
      params.type = 'button';
    }
    if (params.class) {
      params.class += ' h5p-joubelui-button';
    }
    else {
      params.class = 'h5p-joubelui-button';
    }
    return $('<' + type + '/>', params);
  };

  /**
   * Fix for iframe scoll bug in IOS. When focusing an element that doesn't have
   * focus support by default the iframe will scroll the parent frame so that
   * the focused element is out of view. This varies dependening on the elements
   * of the parent frame.
   */
  if (H5P.isFramed && !H5P.hasiOSiframeScrollFix &&
      /iPad|iPhone|iPod/.test(navigator.userAgent)) {
    H5P.hasiOSiframeScrollFix = true;

    // Keep track of original focus function
    var focus = HTMLElement.prototype.focus;

    // Override the original focus
    HTMLElement.prototype.focus = function () {
      // Only focus the element if it supports it natively
      if ( (this instanceof HTMLAnchorElement ||
            this instanceof HTMLInputElement ||
            this instanceof HTMLSelectElement ||
            this instanceof HTMLTextAreaElement ||
            this instanceof HTMLButtonElement ||
            this instanceof HTMLIFrameElement ||
            this instanceof HTMLAreaElement) && // HTMLAreaElement isn't supported by Safari yet.
          !this.getAttribute('role')) { // Focus breaks if a different role has been set
          // In theory this.isContentEditable should be able to recieve focus,
          // but it didn't work when tested.

        // Trigger the original focus with the proper context
        focus.call(this);
      }
    };
  }

  return JoubelUI;
})(H5P.jQuery);
;H5P.Question = (function ($, EventDispatcher, JoubelUI) {

  /**
   * Extending this class make it alot easier to create tasks for other
   * content types.
   *
   * @class H5P.Question
   * @extends H5P.EventDispatcher
   * @param {string} type
   */
  function Question(type) {
    var self = this;

    // Inheritance
    EventDispatcher.call(self);

    // Register default section order
    self.order = ['video', 'image', 'audio', 'introduction', 'content', 'explanation', 'feedback', 'scorebar', 'buttons', 'read'];

    // Keep track of registered sections
    var sections = {};

    // Buttons
    var buttons = {};
    var buttonOrder = [];

    // Wrapper when attached
    var $wrapper;

    // Click element
    var clickElement;

    // ScoreBar
    var scoreBar;

    // Keep track of the feedback's visual status.
    var showFeedback;

    // Keep track of which buttons are scheduled for hiding.
    var buttonsToHide = [];

    // Keep track of which buttons are scheduled for showing.
    var buttonsToShow = [];

    // Keep track of the hiding and showing of buttons.
    var toggleButtonsTimer;
    var toggleButtonsTransitionTimer;
    var buttonTruncationTimer;

    // Keeps track of initialization of question
    var initialized = false;

    /**
     * @type {Object} behaviour Behaviour of Question
     * @property {Boolean} behaviour.disableFeedback Set to true to disable feedback section
     */
    var behaviour = {
      disableFeedback: false,
      disableReadSpeaker: false
    };

    // Keeps track of thumb state
    var imageThumb = true;

    // Keeps track of image transitions
    var imageTransitionTimer;

    // Keep track of whether sections is transitioning.
    var sectionsIsTransitioning = false;

    // Keep track of auto play state
    var disableAutoPlay = false;

    // Feedback transition timer
    var feedbackTransitionTimer;

    // Used when reading messages to the user
    var $read, readText;

    /**
     * Register section with given content.
     *
     * @private
     * @param {string} section ID of the section
     * @param {(string|H5P.jQuery)} [content]
     */
    var register = function (section, content) {
      sections[section] = {};
      var $e = sections[section].$element = $('<div/>', {
        'class': 'h5p-question-' + section,
      });
      if (content) {
        $e[content instanceof $ ? 'append' : 'html'](content);
      }
    };

    /**
     * Update registered section with content.
     *
     * @private
     * @param {string} section ID of the section
     * @param {(string|H5P.jQuery)} content
     */
    var update = function (section, content) {
      if (content instanceof $) {
        sections[section].$element.html('').append(content);
      }
      else {
        sections[section].$element.html(content);
      }
    };

    /**
     * Insert element with given ID into the DOM.
     *
     * @private
     * @param {array|Array|string[]} order
     * List with ordered element IDs
     * @param {string} id
     * ID of the element to be inserted
     * @param {Object} elements
     * Maps ID to the elements
     * @param {H5P.jQuery} $container
     * Parent container of the elements
     */
    var insert = function (order, id, elements, $container) {
      // Try to find an element id should be after
      for (var i = 0; i < order.length; i++) {
        if (order[i] === id) {
          // Found our pos
          while (i > 0 &&
          (elements[order[i - 1]] === undefined ||
          !elements[order[i - 1]].isVisible)) {
            i--;
          }
          if (i === 0) {
            // We are on top.
            elements[id].$element.prependTo($container);
          }
          else {
            // Add after element
            elements[id].$element.insertAfter(elements[order[i - 1]].$element);
          }
          elements[id].isVisible = true;
          break;
        }
      }
    };

    /**
     * Make feedback into a popup and position relative to click.
     *
     * @private
     * @param {string} [closeText] Text for the close button
     */
    var makeFeedbackPopup = function (closeText) {
      var $element = sections.feedback.$element;
      var $parent = sections.content.$element;
      var $click = (clickElement != null ? clickElement.$element : null);

      $element.appendTo($parent).addClass('h5p-question-popup');

      if (sections.scorebar) {
        sections.scorebar.$element.appendTo($element);
      }

      $parent.addClass('h5p-has-question-popup');

      // Draw the tail
      var $tail = $('<div/>', {
        'class': 'h5p-question-feedback-tail'
      }).hide()
        .appendTo($parent);

      // Draw the close button
      var $close = $('<div/>', {
        'class': 'h5p-question-feedback-close',
        'tabindex': 0,
        'title': closeText,
        on: {
          click: function (event) {
            $element.remove();
            $tail.remove();
            event.preventDefault();
          },
          keydown: function (event) {
            switch (event.which) {
              case 13: // Enter
              case 32: // Space
                $element.remove();
                $tail.remove();
                event.preventDefault();
            }
          }
        }
      }).hide().appendTo($element);

      if ($click != null) {
        if ($click.hasClass('correct')) {
          $element.addClass('h5p-question-feedback-correct');
          $close.show();
          sections.buttons.$element.hide();
        }
        else {
          sections.buttons.$element.appendTo(sections.feedback.$element);
        }
      }

      positionFeedbackPopup($element, $click);
    };

    /**
     * Position the feedback popup.
     *
     * @private
     * @param {H5P.jQuery} $element Feedback div
     * @param {H5P.jQuery} $click Visual click div
     */
    var positionFeedbackPopup = function ($element, $click) {
      var $container = $element.parent();
      var $tail = $element.siblings('.h5p-question-feedback-tail');
      var popupWidth = $element.outerWidth();
      var popupHeight = setElementHeight($element);
      var space = 15;
      var disableTail = false;
      var positionY = $container.height() / 2 - popupHeight / 2;
      var positionX = $container.width() / 2 - popupWidth / 2;
      var tailX = 0;
      var tailY = 0;
      var tailRotation = 0;

      if ($click != null) {
        // Edge detection for click, takes space into account
        var clickNearTop = ($click[0].offsetTop < space);
        var clickNearBottom = ($click[0].offsetTop + $click.height() > $container.height() - space);
        var clickNearLeft = ($click[0].offsetLeft < space);
        var clickNearRight = ($click[0].offsetLeft + $click.width() > $container.width() - space);

        // Click is not in a corner or close to edge, calculate position normally
        positionX = $click[0].offsetLeft - popupWidth / 2  + $click.width() / 2;
        positionY = $click[0].offsetTop - popupHeight - space;
        tailX = positionX + popupWidth / 2 - $tail.width() / 2;
        tailY = positionY + popupHeight - ($tail.height() / 2);
        tailRotation = 225;

        // If popup is outside top edge, position under click instead
        if (popupHeight + space > $click[0].offsetTop) {
          positionY = $click[0].offsetTop + $click.height() + space;
          tailY = positionY - $tail.height() / 2 ;
          tailRotation = 45;
        }

        // If popup is outside left edge, position left
        if (positionX < 0) {
          positionX = 0;
        }

        // If popup is outside right edge, position right
        if (positionX + popupWidth > $container.width()) {
          positionX = $container.width() - popupWidth;
        }

        // Special cases such as corner clicks, or close to an edge, they override X and Y positions if met
        if (clickNearTop && (clickNearLeft || clickNearRight)) {
          positionX = $click[0].offsetLeft + (clickNearLeft ? $click.width() : -popupWidth);
          positionY = $click[0].offsetTop + $click.height();
          disableTail = true;
        }
        else if (clickNearBottom && (clickNearLeft || clickNearRight)) {
          positionX = $click[0].offsetLeft + (clickNearLeft ? $click.width() : -popupWidth);
          positionY = $click[0].offsetTop - popupHeight;
          disableTail = true;
        }
        else if (!clickNearTop && !clickNearBottom) {
          if (clickNearLeft || clickNearRight) {
            positionY = $click[0].offsetTop - popupHeight / 2 + $click.width() / 2;
            positionX = $click[0].offsetLeft + (clickNearLeft ? $click.width() + space : -popupWidth + -space);
            // Make sure this does not position the popup off screen
            if (positionX < 0) {
              positionX = 0;
              disableTail = true;
            }
            else {
              tailX = positionX + (clickNearLeft ? - $tail.width() / 2 : popupWidth - $tail.width() / 2);
              tailY = positionY + popupHeight / 2 - $tail.height() / 2;
              tailRotation = (clickNearLeft ? 315 : 135);
            }
          }
        }

        // Contain popup from overflowing bottom edge
        if (positionY + popupHeight > $container.height()) {
          positionY = $container.height() - popupHeight;

          if (popupHeight > $container.height() - ($click[0].offsetTop + $click.height() + space)) {
            disableTail = true;
          }
        }
      }
      else {
        disableTail = true;
      }

      // Contain popup from ovreflowing top edge
      if (positionY < 0) {
        positionY = 0;
      }

      $element.css({top: positionY, left: positionX});
      $tail.css({top: tailY, left: tailX});

      if (!disableTail) {
        $tail.css({
          'left': tailX,
          'top': tailY,
          'transform': 'rotate(' + tailRotation + 'deg)'
        }).show();
      }
      else {
        $tail.hide();
      }
    };

    /**
     * Set element max height, used for animations.
     *
     * @param {H5P.jQuery} $element
     */
    var setElementHeight = function ($element) {
      if (!$element.is(':visible')) {
        // No animation
        $element.css('max-height', 'none');
        return;
      }

      // If this element is shown in the popup, we can't set width to 100%,
      // since it already has a width set in CSS
      var isFeedbackPopup = $element.hasClass('h5p-question-popup');

      // Get natural element height
      var $tmp = $element.clone()
        .css({
          'position': 'absolute',
          'max-height': 'none',
          'width': isFeedbackPopup ? '' : '100%'
        })
        .appendTo($element.parent());

      // Need to take margins into account when calculating available space
      var sideMargins = parseFloat($element.css('margin-left'))
        + parseFloat($element.css('margin-right'));
      var tmpElWidth = $tmp.css('width') ? $tmp.css('width') : '100%';
      $tmp.css('width', 'calc(' + tmpElWidth + ' - ' + sideMargins + 'px)');

      // Apply height to element
      var h = Math.round($tmp.get(0).getBoundingClientRect().height);
      var fontSize = parseFloat($element.css('fontSize'));
      var relativeH = h / fontSize;
      $element.css('max-height', relativeH + 'em');
      $tmp.remove();

      if (h > 0 && sections.buttons && sections.buttons.$element === $element) {
        // Make sure buttons section is visible
        showSection(sections.buttons);

        // Resize buttons after resizing button section
        setTimeout(resizeButtons, 150);
      }
      return h;
    };

    /**
     * Does the actual job of hiding the buttons scheduled for hiding.
     *
     * @private
     * @param {boolean} [relocateFocus] Find a new button to focus
     */
    var hideButtons = function (relocateFocus) {
      for (var i = 0; i < buttonsToHide.length; i++) {
        hideButton(buttonsToHide[i].id);
      }
      buttonsToHide = [];

      if (relocateFocus) {
        self.focusButton();
      }
    };

    /**
     * Does the actual hiding.
     * @private
     * @param {string} buttonId
     */
    var hideButton = function (buttonId) {
      // Using detach() vs hide() makes it harder to cheat.
      buttons[buttonId].$element.detach();
      buttons[buttonId].isVisible = false;
    };

    /**
     * Shows the buttons on the next tick. This is to avoid buttons flickering
     * If they're both added and removed on the same tick.
     *
     * @private
     */
    var toggleButtons = function () {
      // If no buttons section, return
      if (sections.buttons === undefined) {
        return;
      }

      // Clear transition timer, reevaluate if buttons will be detached
      clearTimeout(toggleButtonsTransitionTimer);

      // Show buttons
      for (var i = 0; i < buttonsToShow.length; i++) {
        insert(buttonOrder, buttonsToShow[i].id, buttons, sections.buttons.$element);
        buttons[buttonsToShow[i].id].isVisible = true;
      }
      buttonsToShow = [];

      // Hide buttons
      var numToHide = 0;
      var relocateFocus = false;
      for (var j = 0; j < buttonsToHide.length; j++) {
        var button = buttons[buttonsToHide[j].id];
        if (button.isVisible) {
          numToHide += 1;
        }
        if (button.$element.is(':focus')) {
          // Move focus to the first visible button.
          relocateFocus = true;
        }
      }

      var animationTimer = 150;
      if (sections.feedback && sections.feedback.$element.hasClass('h5p-question-popup')) {
        animationTimer = 0;
      }

      if (numToHide === sections.buttons.$element.children().length) {
        // All buttons are going to be hidden. Hide container using transition.
        hideSection(sections.buttons);
        // Detach buttons
        hideButtons(relocateFocus);
      }
      else {
        hideButtons(relocateFocus);

        // Show button section
        if (!sections.buttons.$element.is(':empty')) {
          showSection(sections.buttons);
          setElementHeight(sections.buttons.$element);

          // Trigger resize after animation
          toggleButtonsTransitionTimer = setTimeout(function () {
            self.trigger('resize');
          }, animationTimer);
        }

        // Resize buttons to fit container
        resizeButtons();
      }

      toggleButtonsTimer = undefined;
    };

    /**
     * Allows for scaling of the question image.
     */
    var scaleImage = function () {
      var $imgSection = sections.image.$element;
      clearTimeout(imageTransitionTimer);

      // Add this here to avoid initial transition of the image making
      // content overflow. Alternatively we need to trigger a resize.
      $imgSection.addClass('animatable');

      if (imageThumb) {

        // Expand image
        $(this).attr('aria-expanded', true);
        $imgSection.addClass('h5p-question-image-fill-width');
        imageThumb = false;

        imageTransitionTimer = setTimeout(function () {
          self.trigger('resize');
        }, 600);
      }
      else {

        // Scale down image
        $(this).attr('aria-expanded', false);
        $imgSection.removeClass('h5p-question-image-fill-width');
        imageThumb = true;

        imageTransitionTimer = setTimeout(function () {
          self.trigger('resize');
        }, 600);
      }
    };

    /**
     * Get scrollable ancestor of element
     *
     * @private
     * @param {H5P.jQuery} $element
     * @param {Number} [currDepth=0] Current recursive calls to ancestor, stop at maxDepth
     * @param {Number} [maxDepth=5] Maximum depth for finding ancestor.
     * @returns {H5P.jQuery} Parent element that is scrollable
     */
    var findScrollableAncestor = function ($element, currDepth, maxDepth) {
      if (!currDepth) {
        currDepth = 0;
      }
      if (!maxDepth) {
        maxDepth = 5;
      }
      // Check validation of element or if we have reached document root
      if (!$element || !($element instanceof $) || document === $element.get(0) || currDepth >= maxDepth) {
        return;
      }

      if ($element.css('overflow-y') === 'auto') {
        return $element;
      }
      else {
        return findScrollableAncestor($element.parent(), currDepth + 1, maxDepth);
      }
    };

    /**
     * Scroll to bottom of Question.
     *
     * @private
     */
    var scrollToBottom = function () {
      if (!$wrapper || ($wrapper.hasClass('h5p-standalone') && !H5P.isFullscreen)) {
        return; // No scroll
      }

      var scrollableAncestor = findScrollableAncestor($wrapper);

      // Scroll to bottom of scrollable ancestor
      if (scrollableAncestor) {
        scrollableAncestor.animate({
          scrollTop: $wrapper.css('height')
        }, "slow");
      }
    };

    /**
     * Resize buttons to fit container width
     *
     * @private
     */
    var resizeButtons = function () {
      if (!buttons || !sections.buttons) {
        return;
      }

      var go = function () {
        // Don't do anything if button elements are not visible yet
        if (!sections.buttons.$element.is(':visible')) {
          return;
        }

        // Width of all buttons
        var buttonsWidth = {
          max: 0,
          min: 0,
          current: 0
        };

        for (var i in buttons) {
          var button = buttons[i];
          if (button.isVisible) {
            setButtonWidth(buttons[i]);
            buttonsWidth.max += button.width.max;
            buttonsWidth.min += button.width.min;
            buttonsWidth.current += button.isTruncated ? button.width.min : button.width.max;
          }
        }

        var makeButtonsFit = function (availableWidth) {
          if (buttonsWidth.max < availableWidth) {
            // It is room for everyone on the right side of the score bar (without truncating)
            if (buttonsWidth.max !== buttonsWidth.current) {
              // Need to make everyone big
              restoreButtonLabels(buttonsWidth.current, availableWidth);
            }
            return true;
          }
          else if (buttonsWidth.min < availableWidth) {
            // Is it room for everyone on the right side of the score bar with truncating?
            if (buttonsWidth.current > availableWidth) {
              removeButtonLabels(buttonsWidth.current, availableWidth);
            }
            else {
              restoreButtonLabels(buttonsWidth.current, availableWidth);
            }
            return true;
          }
          return false;
        };

        toggleFullWidthScorebar(false);

        var buttonSectionWidth = Math.floor(sections.buttons.$element.width()) - 1;

        if (!makeButtonsFit(buttonSectionWidth)) {
          // If we get here we need to wrap:
          toggleFullWidthScorebar(true);
          buttonSectionWidth = Math.floor(sections.buttons.$element.width()) - 1;
          makeButtonsFit(buttonSectionWidth);
        }
      };

      // If visible, resize right away
      if (sections.buttons.$element.is(':visible')) {
        go();
      }
      else { // If not visible, try on the next tick
        // Clear button truncation timer if within a button truncation function
        if (buttonTruncationTimer) {
          clearTimeout(buttonTruncationTimer);
        }
        buttonTruncationTimer = setTimeout(function () {
          buttonTruncationTimer = undefined;
          go();
        }, 0);
      }
    };

    var toggleFullWidthScorebar = function (enabled) {
      if (sections.scorebar &&
          sections.scorebar.$element &&
          sections.scorebar.$element.hasClass('h5p-question-visible')) {
        sections.buttons.$element.addClass('has-scorebar');
        sections.buttons.$element.toggleClass('wrap', enabled);
        sections.scorebar.$element.toggleClass('full-width', enabled);
      }
      else {
        sections.buttons.$element.removeClass('has-scorebar');
      }
    };

    /**
     * Remove button labels until they use less than max width.
     *
     * @private
     * @param {Number} buttonsWidth Total width of all buttons
     * @param {Number} maxButtonsWidth Max width allowed for buttons
     */
    var removeButtonLabels = function (buttonsWidth, maxButtonsWidth) {
      // Reverse traversal
      for (var i = buttonOrder.length - 1; i >= 0; i--) {
        var buttonId = buttonOrder[i];
        var button = buttons[buttonId];
        if (!button.isTruncated && button.isVisible) {
          var $button = button.$element;
          buttonsWidth -= button.width.max - button.width.min;

          // Remove label
          button.$element.attr('aria-label', $button.text()).html('').addClass('truncated');
          button.isTruncated = true;
          if (buttonsWidth <= maxButtonsWidth) {
            // Buttons are small enough.
            return;
          }
        }
      }
    };

    /**
     * Restore button labels until it fills maximum possible width without exceeding the max width.
     *
     * @private
     * @param {Number} buttonsWidth Total width of all buttons
     * @param {Number} maxButtonsWidth Max width allowed for buttons
     */
    var restoreButtonLabels = function (buttonsWidth, maxButtonsWidth) {
      for (var i = 0; i < buttonOrder.length; i++) {
        var buttonId = buttonOrder[i];
        var button = buttons[buttonId];
        if (button.isTruncated && button.isVisible) {
          // Calculate new total width of buttons with a static pixel for consistency cross-browser
          buttonsWidth += button.width.max - button.width.min + 1;

          if (buttonsWidth > maxButtonsWidth) {
            return;
          }
          // Restore label
          button.$element.html(button.text);
          button.$element.removeClass('truncated');
          button.isTruncated = false;
        }
      }
    };

    /**
     * Helper function for finding index of keyValue in array
     *
     * @param {String} keyValue Value to be found
     * @param {String} key In key
     * @param {Array} array In array
     * @returns {number}
     */
    var existsInArray = function (keyValue, key, array) {
      var i;
      for (i = 0; i < array.length; i++) {
        if (array[i][key] === keyValue) {
          return i;
        }
      }
      return -1;
    };

    /**
     * Show a section
     * @param {Object} section
     */
    var showSection = function (section) {
      section.$element.addClass('h5p-question-visible');
      section.isVisible = true;
    };

    /**
     * Hide a section
     * @param {Object} section
     */
    var hideSection = function (section) {
      section.$element.css('max-height', '');
      section.isVisible = false;

      setTimeout(function () {
        // Only hide if section hasn't been set to visible in the meantime
        if (!section.isVisible) {
          section.$element.removeClass('h5p-question-visible');
        }
      }, 150);
    };

    /**
     * Set behaviour for question.
     *
     * @param {Object} options An object containing behaviour that will be extended by Question
     */
    self.setBehaviour = function (options) {
      $.extend(behaviour, options);
    };

    /**
     * A video to display above the task.
     *
     * @param {object} params
     */
    self.setVideo = function (params) {
      sections.video = {
        $element: $('<div/>', {
          'class': 'h5p-question-video'
        })
      };

      if (disableAutoPlay && params.params.playback) {
        params.params.playback.autoplay = false;
      }

      // Never fit to wrapper
      if (!params.params.visuals) {
        params.params.visuals = {};
      }
      params.params.visuals.fit = false;
      sections.video.instance = H5P.newRunnable(params, self.contentId, sections.video.$element, true);
      var fromVideo = false; // Hack to avoid never ending loop
      sections.video.instance.on('resize', function () {
        fromVideo = true;
        self.trigger('resize');
        fromVideo = false;
      });
      self.on('resize', function () {
        if (!fromVideo) {
          sections.video.instance.trigger('resize');
        }
      });

      return self;
    };

    /**
     * An audio player to display above the task.
     *
     * @param {object} params
     */
    self.setAudio = function (params) {
      params.params = params.params || {};

      sections.audio = {
        $element: $('<div/>', {
          'class': 'h5p-question-audio',
        })
      };

      if (disableAutoPlay) {
        params.params.autoplay = false;
      }
      else if (params.params.playerMode === 'transparent') {
        params.params.autoplay = true; // false doesn't make sense for transparent audio
      }

      sections.audio.instance = H5P.newRunnable(params, self.contentId, sections.audio.$element, true);
      // The height value that is set by H5P.Audio is counter-productive here.
      if (sections.audio.instance.audio) {
        sections.audio.instance.audio.style.height = '';
      }

      return self;
    };

    /**
     * Will stop any playback going on in the task.
     */
    self.pause = function () {
      if (sections.video && sections.video.isVisible) {
        sections.video.instance.pause();
      }
      if (sections.audio && sections.audio.isVisible) {
        sections.audio.instance.pause();
      }
    };

    /**
     * Start playback of video
     */
    self.play = function () {
      if (sections.video && sections.video.isVisible) {
        sections.video.instance.play();
      }
      if (sections.audio && sections.audio.isVisible) {
        sections.audio.instance.play();
      }
    };

    /**
     * Disable auto play, useful in editors.
     */
    self.disableAutoPlay = function () {
      disableAutoPlay = true;
    };

    /**
     * Add task image.
     *
     * @param {string} path Relative
     * @param {Object} [options] Options object
     * @param {string} [options.alt] Text representation
     * @param {string} [options.title] Hover text
     * @param {Boolean} [options.disableImageZooming] Set as true to disable image zooming
     */
    self.setImage = function (path, options) {
      options = options ? options : {};
      sections.image = {};
      // Image container
      sections.image.$element = $('<div/>', {
        'class': 'h5p-question-image h5p-question-image-fill-width'
      });

      // Inner wrap
      var $imgWrap = $('<div/>', {
        'class': 'h5p-question-image-wrap',
        appendTo: sections.image.$element
      });

      // Image element
      var $img = $('<img/>', {
        src: H5P.getPath(path, self.contentId),
        alt: (options.alt === undefined ? '' : options.alt),
        title: (options.title === undefined ? '' : options.title),
        on: {
          load: function () {
            self.trigger('imageLoaded', this);
            self.trigger('resize');
          }
        },
        appendTo: $imgWrap
      });

      // Disable image zooming
      if (options.disableImageZooming) {
        $img.css('maxHeight', 'none');

        // Make sure we are using the correct amount of width at all times
        var determineImgWidth = function () {

          // Remove margins if natural image width is bigger than section width
          var imageSectionWidth = sections.image.$element.get(0).getBoundingClientRect().width;

          // Do not transition, for instant measurements
          $imgWrap.css({
            '-webkit-transition': 'none',
            'transition': 'none'
          });

          // Margin as translateX on both sides of image.
          var diffX = 2 * ($imgWrap.get(0).getBoundingClientRect().left -
            sections.image.$element.get(0).getBoundingClientRect().left);

          if ($img.get(0).naturalWidth >= imageSectionWidth - diffX) {
            sections.image.$element.addClass('h5p-question-image-fill-width');
          }
          else { // Use margin for small res images
            sections.image.$element.removeClass('h5p-question-image-fill-width');
          }

          // Reset transition rules
          $imgWrap.css({
            '-webkit-transition': '',
            'transition': ''
          });
        };

        // Determine image width
        if ($img.is(':visible')) {
          determineImgWidth();
        }
        else {
          $img.on('load', determineImgWidth);
        }

        // Skip adding zoom functionality
        return;
      }

      var sizeDetermined = false;
      var determineSize = function () {
        if (sizeDetermined || !$img.is(':visible')) {
          return; // Try again next time.
        }

        $imgWrap.addClass('h5p-question-image-scalable')
          .attr('aria-expanded', false)
          .attr('role', 'button')
          .attr('tabIndex', '0')
          .on('click', function (event) {
            if (event.which === 1) {
              scaleImage.apply(this); // Left mouse button click
            }
          }).on('keypress', function (event) {
            if (event.which === 32) {
              event.preventDefault(); // Prevent default behaviour; page scroll down
              scaleImage.apply(this); // Space bar pressed
            }
          });
        sections.image.$element.removeClass('h5p-question-image-fill-width');

        sizeDetermined  = true; // Prevent any futher events
      };

      self.on('resize', determineSize);

      return self;
    };

    /**
     * Add the introduction section.
     *
     * @param {(string|H5P.jQuery)} content
     */
    self.setIntroduction = function (content) {
      register('introduction', content);

      return self;
    };

    /**
     * Add the content section.
     *
     * @param {(string|H5P.jQuery)} content
     * @param {Object} [options]
     * @param {string} [options.class]
     */
    self.setContent = function (content, options) {
      register('content', content);

      if (options && options.class) {
        sections.content.$element.addClass(options.class);
      }

      return self;
    };

    /**
     * Force readspeaker to read text. Useful when you have to use
     * setTimeout for animations.
     */
    self.read = function (content) {
      if (!$read) {
        return; // Not ready yet
      }

      if (readText) {
        // Combine texts if called multiple times
        readText += (readText.substr(-1, 1) === '.' ? ' ' : '. ') + content;
      }
      else {
        readText = content;
      }

      // Set text
      $read.html(readText);

      setTimeout(function () {
        // Stop combining when done reading
        readText = null;
        $read.html('');
      }, 100);
    };

    /**
     * Read feedback
     */
    self.readFeedback = function () {
      var invalidFeedback =
        behaviour.disableReadSpeaker ||
        !showFeedback ||
        !sections.feedback ||
        !sections.feedback.$element;

      if (invalidFeedback) {
        return;
      }

      var $feedbackText = $('.h5p-question-feedback-content-text', sections.feedback.$element);
      if ($feedbackText && $feedbackText.html() && $feedbackText.html().length) {
        self.read($feedbackText.html());
      }
    };

    /**
     * Remove feedback
     *
     * @return {H5P.Question}
     */
    self.removeFeedback = function () {

      clearTimeout(feedbackTransitionTimer);

      if (sections.feedback && showFeedback) {

        showFeedback = false;

        // Hide feedback & scorebar
        hideSection(sections.scorebar);
        hideSection(sections.feedback);

        sectionsIsTransitioning = true;

        // Detach after transition
        feedbackTransitionTimer = setTimeout(function () {
          // Avoiding Transition.onTransitionEnd since it will register multiple events, and there's no way to cancel it if the transition changes back to "show" while the animation is happening.
          if (!showFeedback) {
            sections.feedback.$element.children().detach();
            sections.scorebar.$element.children().detach();

            // Trigger resize after animation
            self.trigger('resize');
          }
          sectionsIsTransitioning = false;
          scoreBar.setScore(0);
        }, 150);

        if ($wrapper) {
          $wrapper.find('.h5p-question-feedback-tail').remove();
        }
      }

      return self;
    };

    /**
     * Set feedback message.
     *
     * @param {string} [content]
     * @param {number} score The score
     * @param {number} maxScore The maximum score for this question
     * @param {string} [scoreBarLabel] Makes it easier for readspeakers to identify the scorebar
     * @param {string} [helpText] Help text that describes the score inside a tip icon
     * @param {object} [popupSettings] Extra settings for popup feedback
     * @param {boolean} [popupSettings.showAsPopup] Should the feedback display as popup?
     * @param {string} [popupSettings.closeText] Translation for close button text
     * @param {object} [popupSettings.click] Element representing where user clicked on screen
     */
    self.setFeedback = function (content, score, maxScore, scoreBarLabel, helpText, popupSettings, scoreExplanationButtonLabel) {
      // Feedback is disabled
      if (behaviour.disableFeedback) {
        return self;
      }

      // Need to toggle buttons right away to avoid flickering/blinking
      // Note: This means content types should invoke hide/showButton before setFeedback
      toggleButtons();

      clickElement = (popupSettings != null && popupSettings.click != null ? popupSettings.click : null);
      clearTimeout(feedbackTransitionTimer);

      var $feedback = $('<div>', {
        'class': 'h5p-question-feedback-container'
      });

      var $feedbackContent = $('<div>', {
        'class': 'h5p-question-feedback-content'
      }).appendTo($feedback);

      // Feedback text
      $('<div>', {
        'class': 'h5p-question-feedback-content-text',
        'html': content
      }).appendTo($feedbackContent);

      var $scorebar = $('<div>', {
        'class': 'h5p-question-scorebar-container'
      });
      if (scoreBar === undefined) {
        scoreBar = JoubelUI.createScoreBar(maxScore, scoreBarLabel, helpText, scoreExplanationButtonLabel);
      }
      scoreBar.appendTo($scorebar);

      $feedbackContent.toggleClass('has-content', content !== undefined && content.length > 0);

      // Feedback for readspeakers
      if (!behaviour.disableReadSpeaker && scoreBarLabel) {
        self.read(scoreBarLabel.replace(':num', score).replace(':total', maxScore) + '. ' + (content ? content : ''));
      }

      showFeedback = true;
      if (sections.feedback) {
        // Update section
        update('feedback', $feedback);
        update('scorebar', $scorebar);
      }
      else {
        // Create section
        register('feedback', $feedback);
        register('scorebar', $scorebar);
        if (initialized && $wrapper) {
          insert(self.order, 'feedback', sections, $wrapper);
          insert(self.order, 'scorebar', sections, $wrapper);
        }
      }

      showSection(sections.feedback);
      showSection(sections.scorebar);

      resizeButtons();

      if (popupSettings != null && popupSettings.showAsPopup == true) {
        makeFeedbackPopup(popupSettings.closeText);
        scoreBar.setScore(score);
      }
      else {
        // Show feedback section
        feedbackTransitionTimer = setTimeout(function () {
          setElementHeight(sections.feedback.$element);
          setElementHeight(sections.scorebar.$element);
          sectionsIsTransitioning = true;

          // Scroll to bottom after showing feedback
          scrollToBottom();

          // Trigger resize after animation
          feedbackTransitionTimer = setTimeout(function () {
            sectionsIsTransitioning = false;
            self.trigger('resize');
            scoreBar.setScore(score);
          }, 150);
        }, 0);
      }

      return self;
    };

    /**
     * Set feedback content (no animation).
     *
     * @param {string} content
     * @param {boolean} [extendContent] True will extend content, instead of replacing it
     */
    self.updateFeedbackContent = function (content, extendContent) {
      if (sections.feedback && sections.feedback.$element) {

        if (extendContent) {
          content = $('.h5p-question-feedback-content', sections.feedback.$element).html() + ' ' + content;
        }

        // Update feedback content html
        $('.h5p-question-feedback-content', sections.feedback.$element).html(content).addClass('has-content');

        // Make sure the height is correct
        setElementHeight(sections.feedback.$element);

        // Need to trigger resize when feedback has finished transitioning
        setTimeout(self.trigger.bind(self, 'resize'), 150);
      }

      return self;
    };

    /**
     * Set the content of the explanation / feedback panel
     *
     * @param {Object} data
     * @param {string} data.correct
     * @param {string} data.wrong
     * @param {string} data.text
     * @param {string} title Title for explanation panel
     *
     * @return {H5P.Question}
     */
    self.setExplanation = function (data, title) {
      if (data) {
        var explainer = new H5P.Question.Explainer(title, data);

        if (sections.explanation) {
          // Update section
          update('explanation', explainer.getElement());
        }
        else {
          register('explanation', explainer.getElement());

          if (initialized && $wrapper) {
            insert(self.order, 'explanation', sections, $wrapper);
          }
        }
      }
      else if (sections.explanation) {
        // Hide explanation section
        sections.explanation.$element.children().detach();
      }

      return self;
    };

    /**
     * Checks to see if button is registered.
     *
     * @param {string} id
     * @returns {boolean}
     */
    self.hasButton = function (id) {
      return (buttons[id] !== undefined);
    };

    /**
     * @typedef {Object} ConfirmationDialog
     * @property {boolean} [enable] Must be true to show confirmation dialog
     * @property {Object} [instance] Instance that uses confirmation dialog
     * @property {jQuery} [$parentElement] Append to this element.
     * @property {Object} [l10n] Translatable fields
     * @property {string} [l10n.header] Header text
     * @property {string} [l10n.body] Body text
     * @property {string} [l10n.cancelLabel]
     * @property {string} [l10n.confirmLabel]
     */

    /**
     * Register buttons for the task.
     *
     * @param {string} id
     * @param {string} text label
     * @param {function} clicked
     * @param {boolean} [visible=true]
     * @param {Object} [options] Options for button
     * @param {Object} [extras] Extra options
     * @param {ConfirmationDialog} [extras.confirmationDialog] Confirmation dialog
     * @param {Object} [extras.contentData] Content data
     * @params {string} [extras.textIfSubmitting] Text to display if submitting
     */
    self.addButton = function (id, text, clicked, visible, options, extras) {
      if (buttons[id]) {
        return self; // Already registered
      }

      if (sections.buttons === undefined)  {
        // We have buttons, register wrapper
        register('buttons');
        if (initialized) {
          insert(self.order, 'buttons', sections, $wrapper);
        }
      }

      extras = extras || {};
      extras.confirmationDialog = extras.confirmationDialog || {};
      options = options || {};

      var confirmationDialog =
        self.addConfirmationDialogToButton(extras.confirmationDialog, clicked);

      /**
       * Handle button clicks through both mouse and keyboard
       * @private
       */
      var handleButtonClick = function () {
        if (extras.confirmationDialog.enable && confirmationDialog) {
          // Show popups section if used
          if (!extras.confirmationDialog.$parentElement) {
            sections.popups.$element.removeClass('hidden');
          }
          confirmationDialog.show($e.position().top);
        }
        else {
          clicked();
        }
      };

      const isSubmitting = extras.contentData && extras.contentData.standalone
        && (extras.contentData.isScoringEnabled || extras.contentData.isReportingEnabled);

      if (isSubmitting && extras.textIfSubmitting) {
        text = extras.textIfSubmitting;
      }

      buttons[id] = {
        isTruncated: false,
        text: text,
        isVisible: false
      };
      // The button might be <button> or <a>
      // (dependent on options.href set or not)
      var isAnchorTag = (options.href !== undefined);
      var $e = buttons[id].$element = JoubelUI.createButton($.extend({
        'class': 'h5p-question-' + id,
        html: text,
        title: text,
        on: {
          click: function (event) {
            handleButtonClick();
            if (isAnchorTag) {
              event.preventDefault();
            }
          }
        }
      }, options));
      buttonOrder.push(id);

      // The button might be <button> or <a>. If <a>, the space key is not
      // triggering the click event, must therefore handle this here:
      if (isAnchorTag) {
        $e.on('keypress', function (event) {
          if (event.which === 32) { // Space
            handleButtonClick();
            event.preventDefault();
          }
        });
      }

      if (visible === undefined || visible) {
        // Button should be visible
        $e.appendTo(sections.buttons.$element);
        buttons[id].isVisible = true;
        showSection(sections.buttons);
      }

      return self;
    };

    var setButtonWidth = function (button) {
      var $button = button.$element;
      var $tmp = $button.clone()
        .css({
          'position': 'absolute',
          'white-space': 'nowrap',
          'max-width': 'none'
        }).removeClass('truncated')
        .html(button.text)
        .appendTo($button.parent());

      // Calculate max width (button including text)
      button.width = {
        max: Math.ceil($tmp.outerWidth() + parseFloat($tmp.css('margin-left')) + parseFloat($tmp.css('margin-right')))
      };

      // Calculate min width (truncated, icon only)
      $tmp.html('').addClass('truncated');
      button.width.min = Math.ceil($tmp.outerWidth() + parseFloat($tmp.css('margin-left')) + parseFloat($tmp.css('margin-right')));
      $tmp.remove();
    };

    /**
     * Add confirmation dialog to button
     * @param {ConfirmationDialog} options
     *  A confirmation dialog that will be shown before click handler of button
     *  is triggered
     * @param {function} clicked
     *  Click handler of button
     * @return {H5P.ConfirmationDialog|undefined}
     *  Confirmation dialog if enabled
     */
    self.addConfirmationDialogToButton = function (options, clicked) {
      options = options || {};

      if (!options.enable) {
        return;
      }

      // Confirmation dialog
      var confirmationDialog = new H5P.ConfirmationDialog({
        instance: options.instance,
        headerText: options.l10n.header,
        dialogText: options.l10n.body,
        cancelText: options.l10n.cancelLabel,
        confirmText: options.l10n.confirmLabel
      });

      // Determine parent element
      if (options.$parentElement) {
        confirmationDialog.appendTo(options.$parentElement.get(0));
      }
      else {

        // Create popup section and append to that
        if (sections.popups === undefined) {
          register('popups');
          if (initialized) {
            insert(self.order, 'popups', sections, $wrapper);
          }
          sections.popups.$element.addClass('hidden');
          self.order.push('popups');
        }
        confirmationDialog.appendTo(sections.popups.$element.get(0));
      }

      // Add event listeners
      confirmationDialog.on('confirmed', function () {
        if (!options.$parentElement) {
          sections.popups.$element.addClass('hidden');
        }
        clicked();

        // Trigger to content type
        self.trigger('confirmed');
      });

      confirmationDialog.on('canceled', function () {
        if (!options.$parentElement) {
          sections.popups.$element.addClass('hidden');
        }
        // Trigger to content type
        self.trigger('canceled');
      });

      return confirmationDialog;
    };

    /**
     * Show registered button with given identifier.
     *
     * @param {string} id
     * @param {Number} [priority]
     */
    self.showButton = function (id, priority) {
      var aboutToBeHidden = existsInArray(id, 'id', buttonsToHide) !== -1;
      if (buttons[id] === undefined || (buttons[id].isVisible === true && !aboutToBeHidden)) {
        return self;
      }

      priority = priority || 0;

      // Skip if already being shown
      var indexToShow = existsInArray(id, 'id', buttonsToShow);
      if (indexToShow !== -1) {

        // Update priority
        if (buttonsToShow[indexToShow].priority < priority) {
          buttonsToShow[indexToShow].priority = priority;
        }

        return self;
      }

      // Check if button is going to be hidden on next tick
      var exists = existsInArray(id, 'id', buttonsToHide);
      if (exists !== -1) {

        // Skip hiding if higher priority
        if (buttonsToHide[exists].priority <= priority) {
          buttonsToHide.splice(exists, 1);
          buttonsToShow.push({id: id, priority: priority});
        }

      } // If button is not shown
      else if (!buttons[id].$element.is(':visible')) {

        // Show button on next tick
        buttonsToShow.push({id: id, priority: priority});
      }

      if (!toggleButtonsTimer) {
        toggleButtonsTimer = setTimeout(toggleButtons, 0);
      }

      return self;
    };

    /**
     * Hide registered button with given identifier.
     *
     * @param {string} id
     * @param {number} [priority]
     */
    self.hideButton = function (id, priority) {
      var aboutToBeShown = existsInArray(id, 'id', buttonsToShow) !== -1;
      if (buttons[id] === undefined || (buttons[id].isVisible === false && !aboutToBeShown)) {
        return self;
      }

      priority = priority || 0;

      // Skip if already being hidden
      var indexToHide = existsInArray(id, 'id', buttonsToHide);
      if (indexToHide !== -1) {

        // Update priority
        if (buttonsToHide[indexToHide].priority < priority) {
          buttonsToHide[indexToHide].priority = priority;
        }

        return self;
      }

      // Check if buttons is going to be shown on next tick
      var exists = existsInArray(id, 'id', buttonsToShow);
      if (exists !== -1) {

        // Skip showing if higher priority
        if (buttonsToShow[exists].priority <= priority) {
          buttonsToShow.splice(exists, 1);
          buttonsToHide.push({id: id, priority: priority});
        }
      }
      else if (!buttons[id].$element.is(':visible')) {

        // Make sure it is detached in case the container is hidden.
        hideButton(id);
      }
      else {

        // Hide button on next tick.
        buttonsToHide.push({id: id, priority: priority});
      }

      if (!toggleButtonsTimer) {
        toggleButtonsTimer = setTimeout(toggleButtons, 0);
      }

      return self;
    };

    /**
     * Set focus to the given button. If no button is given the first visible
     * button gets focused. This is useful if you lose focus.
     *
     * @param {string} [id]
     */
    self.focusButton = function (id) {
      if (id === undefined) {
        // Find first button that is visible.
        for (var i = 0; i < buttonOrder.length; i++) {
          var button = buttons[buttonOrder[i]];
          if (button && button.isVisible) {
            // Give that button focus
            button.$element.focus();
            break;
          }
        }
      }
      else if (buttons[id] && buttons[id].$element.is(':visible')) {
        // Set focus to requested button
        buttons[id].$element.focus();
      }

      return self;
    };

    /**
     * Toggle readspeaker functionality
     * @param {boolean} [disable] True to disable, false to enable.
     */
    self.toggleReadSpeaker = function (disable) {
      behaviour.disableReadSpeaker = disable || !behaviour.disableReadSpeaker;
    };

    /**
     * Set new element for section.
     *
     * @param {String} id
     * @param {H5P.jQuery} $element
     */
    self.insertSectionAtElement = function (id, $element) {
      if (sections[id] === undefined) {
        register(id);
      }
      sections[id].parent = $element;

      // Insert section if question is not initialized
      if (!initialized) {
        insert([id], id, sections, $element);
      }

      return self;
    };

    /**
     * Attach content to given container.
     *
     * @param {H5P.jQuery} $container
     */
    self.attach = function ($container) {
      if (self.isRoot()) {
        self.setActivityStarted();
      }

      // The first time we attach we also create our DOM elements.
      if ($wrapper === undefined) {
        if (self.registerDomElements !== undefined &&
           (self.registerDomElements instanceof Function ||
           typeof self.registerDomElements === 'function')) {

          // Give the question type a chance to register before attaching
          self.registerDomElements();
        }

        // Create section for reading messages
        $read = $('<div/>', {
          'aria-live': 'polite',
          'class': 'h5p-hidden-read'
        });
        register('read', $read);
        self.trigger('registerDomElements');
      }

      // Prepare container
      $wrapper = $container;
      $container.html('')
        .addClass('h5p-question h5p-' + type);

      // Add sections in given order
      var $sections = [];
      for (var i = 0; i < self.order.length; i++) {
        var section = self.order[i];
        if (sections[section]) {
          if (sections[section].parent) {
            // Section has a different parent
            sections[section].$element.appendTo(sections[section].parent);
          }
          else {
            $sections.push(sections[section].$element);
          }
          sections[section].isVisible = true;
        }
      }

      // Only append once to DOM for optimal performance
      $container.append($sections);

      // Let others react to dom changes
      self.trigger('domChanged', {
        '$target': $container,
        'library': self.libraryInfo.machineName,
        'contentId': self.contentId,
        'key': 'newLibrary'
      }, {'bubbles': true, 'external': true});

      // ??
      initialized = true;

      return self;
    };

    /**
     * Detach all sections from their parents
     */
    self.detachSections = function () {
      // Deinit Question
      initialized = false;

      // Detach sections
      for (var section in sections) {
        sections[section].$element.detach();
      }

      return self;
    };

    // Listen for resize
    self.on('resize', function () {
      // Allow elements to attach and set their height before resizing
      if (!sectionsIsTransitioning && sections.feedback && showFeedback) {
        // Resize feedback to fit
        setElementHeight(sections.feedback.$element);
      }

      // Re-position feedback popup if in use
      var $element = sections.feedback;
      var $click = clickElement;

      if ($element != null && $element.$element != null && $click != null && $click.$element != null) {
        setTimeout(function () {
          positionFeedbackPopup($element.$element, $click.$element);
        }, 10);
      }

      resizeButtons();
    });
  }

  // Inheritance
  Question.prototype = Object.create(EventDispatcher.prototype);
  Question.prototype.constructor = Question;

  /**
   * Determine the overall feedback to display for the question.
   * Returns empty string if no matching range is found.
   *
   * @param {Object[]} feedbacks
   * @param {number} scoreRatio
   * @return {string}
   */
  Question.determineOverallFeedback = function (feedbacks, scoreRatio) {
    scoreRatio = Math.floor(scoreRatio * 100);

    for (var i = 0; i < feedbacks.length; i++) {
      var feedback = feedbacks[i];
      var hasFeedback = (feedback.feedback !== undefined && feedback.feedback.trim().length !== 0);

      if (feedback.from <= scoreRatio && feedback.to >= scoreRatio && hasFeedback) {
        return feedback.feedback;
      }
    }

    return '';
  };

  return Question;
})(H5P.jQuery, H5P.EventDispatcher, H5P.JoubelUI);
;H5P.Question.Explainer = (function ($) {
  /**
   * Constructor
   *
   * @class
   * @param {string} title
   * @param {array} explanations
   */
  function Explainer(title, explanations) {
    var self = this;

    /**
     * Create the DOM structure
     */
    var createHTML = function () {
      self.$explanation = $('<div>', {
        'class': 'h5p-question-explanation-container'
      });

      // Add title:
      $('<div>', {
        'class': 'h5p-question-explanation-title',
        role: 'heading',
        html: title,
        appendTo: self.$explanation
      });

      var $explanationList = $('<ul>', {
        'class': 'h5p-question-explanation-list',
        appendTo: self.$explanation
      });

      for (var i = 0; i < explanations.length; i++) {
        var feedback = explanations[i];
        var $explanationItem = $('<li>', {
          'class': 'h5p-question-explanation-item',
          appendTo: $explanationList
        });

        var $content = $('<div>', {
          'class': 'h5p-question-explanation-status'
        });

        if (feedback.correct) {
          $('<span>', {
            'class': 'h5p-question-explanation-correct',
            html: feedback.correct,
            appendTo: $content
          });
        }
        if (feedback.wrong) {
          $('<span>', {
            'class': 'h5p-question-explanation-wrong',
            html: feedback.wrong,
            appendTo: $content
          });
        }
        $content.appendTo($explanationItem);

        if (feedback.text) {
          $('<div>', {
            'class': 'h5p-question-explanation-text',
            html: feedback.text,
            appendTo: $explanationItem
          });
        }
      }
    };

    createHTML();

    /**
     * Return the container HTMLElement
     *
     * @return {HTMLElement}
     */
    self.getElement = function () {
      return self.$explanation;
    };
  }

  return Explainer;

})(H5P.jQuery);
;(function (Question) {

  /**
   * Makes it easy to add animated score points for your question type.
   *
   * @class H5P.Question.ScorePoints
   */
  Question.ScorePoints = function () {
    var self = this;

    var elements = [];
    var showElementsTimer;

    /**
     * Create the element that displays the score point element for questions.
     *
     * @param {boolean} isCorrect
     * @return {HTMLElement}
     */
    self.getElement = function (isCorrect) {
      var element = document.createElement('div');
      element.classList.add(isCorrect ? 'h5p-question-plus-one' : 'h5p-question-minus-one');
      element.classList.add('h5p-question-hidden-one');
      elements.push(element);

      // Schedule display animation of all added elements
      if (showElementsTimer) {
        clearTimeout(showElementsTimer);
      }
      showElementsTimer = setTimeout(showElements, 0);

      return element;
    };

    /**
     * @private
     */
    var showElements = function () {
      // Determine delay between triggering animations
      var delay = 0;
      var increment = 150;
      var maxTime = 1000;

      if (elements.length && elements.length > Math.ceil(maxTime / increment)) {
        // Animations will run for more than ~1 second, reduce it.
        increment = maxTime / elements.length;
      }

      for (var i = 0; i < elements.length; i++) {
        // Use timer to trigger show
        setTimeout(showElement(elements[i]), delay);

        // Increse delay for next element
        delay += increment;
      }
    };

    /**
     * Trigger transition animation for the given element
     *
     * @private
     * @param {HTMLElement} element
     * @return {function}
     */
    var showElement = function (element) {
      return function () {
        element.classList.remove('h5p-question-hidden-one');
      };
    };
  };

})(H5P.Question);
;/*! For license information please see h5p-interactive-book.js.LICENSE.txt */
(()=>{var t={9552:t=>{"use strict";t.exports={aliceblue:[240,248,255],antiquewhite:[250,235,215],aqua:[0,255,255],aquamarine:[127,255,212],azure:[240,255,255],beige:[245,245,220],bisque:[255,228,196],black:[0,0,0],blanchedalmond:[255,235,205],blue:[0,0,255],blueviolet:[138,43,226],brown:[165,42,42],burlywood:[222,184,135],cadetblue:[95,158,160],chartreuse:[127,255,0],chocolate:[210,105,30],coral:[255,127,80],cornflowerblue:[100,149,237],cornsilk:[255,248,220],crimson:[220,20,60],cyan:[0,255,255],darkblue:[0,0,139],darkcyan:[0,139,139],darkgoldenrod:[184,134,11],darkgray:[169,169,169],darkgreen:[0,100,0],darkgrey:[169,169,169],darkkhaki:[189,183,107],darkmagenta:[139,0,139],darkolivegreen:[85,107,47],darkorange:[255,140,0],darkorchid:[153,50,204],darkred:[139,0,0],darksalmon:[233,150,122],darkseagreen:[143,188,143],darkslateblue:[72,61,139],darkslategray:[47,79,79],darkslategrey:[47,79,79],darkturquoise:[0,206,209],darkviolet:[148,0,211],deeppink:[255,20,147],deepskyblue:[0,191,255],dimgray:[105,105,105],dimgrey:[105,105,105],dodgerblue:[30,144,255],firebrick:[178,34,34],floralwhite:[255,250,240],forestgreen:[34,139,34],fuchsia:[255,0,255],gainsboro:[220,220,220],ghostwhite:[248,248,255],gold:[255,215,0],goldenrod:[218,165,32],gray:[128,128,128],green:[0,128,0],greenyellow:[173,255,47],grey:[128,128,128],honeydew:[240,255,240],hotpink:[255,105,180],indianred:[205,92,92],indigo:[75,0,130],ivory:[255,255,240],khaki:[240,230,140],lavender:[230,230,250],lavenderblush:[255,240,245],lawngreen:[124,252,0],lemonchiffon:[255,250,205],lightblue:[173,216,230],lightcoral:[240,128,128],lightcyan:[224,255,255],lightgoldenrodyellow:[250,250,210],lightgray:[211,211,211],lightgreen:[144,238,144],lightgrey:[211,211,211],lightpink:[255,182,193],lightsalmon:[255,160,122],lightseagreen:[32,178,170],lightskyblue:[135,206,250],lightslategray:[119,136,153],lightslategrey:[119,136,153],lightsteelblue:[176,196,222],lightyellow:[255,255,224],lime:[0,255,0],limegreen:[50,205,50],linen:[250,240,230],magenta:[255,0,255],maroon:[128,0,0],mediumaquamarine:[102,205,170],mediumblue:[0,0,205],mediumorchid:[186,85,211],mediumpurple:[147,112,219],mediumseagreen:[60,179,113],mediumslateblue:[123,104,238],mediumspringgreen:[0,250,154],mediumturquoise:[72,209,204],mediumvioletred:[199,21,133],midnightblue:[25,25,112],mintcream:[245,255,250],mistyrose:[255,228,225],moccasin:[255,228,181],navajowhite:[255,222,173],navy:[0,0,128],oldlace:[253,245,230],olive:[128,128,0],olivedrab:[107,142,35],orange:[255,165,0],orangered:[255,69,0],orchid:[218,112,214],palegoldenrod:[238,232,170],palegreen:[152,251,152],paleturquoise:[175,238,238],palevioletred:[219,112,147],papayawhip:[255,239,213],peachpuff:[255,218,185],peru:[205,133,63],pink:[255,192,203],plum:[221,160,221],powderblue:[176,224,230],purple:[128,0,128],rebeccapurple:[102,51,153],red:[255,0,0],rosybrown:[188,143,143],royalblue:[65,105,225],saddlebrown:[139,69,19],salmon:[250,128,114],sandybrown:[244,164,96],seagreen:[46,139,87],seashell:[255,245,238],sienna:[160,82,45],silver:[192,192,192],skyblue:[135,206,235],slateblue:[106,90,205],slategray:[112,128,144],slategrey:[112,128,144],snow:[255,250,250],springgreen:[0,255,127],steelblue:[70,130,180],tan:[210,180,140],teal:[0,128,128],thistle:[216,191,216],tomato:[255,99,71],turquoise:[64,224,208],violet:[238,130,238],wheat:[245,222,179],white:[255,255,255],whitesmoke:[245,245,245],yellow:[255,255,0],yellowgreen:[154,205,50]}},6855:(t,e,r)=>{var n=r(9552),a=r(521),o=Object.hasOwnProperty,i=Object.create(null);for(var s in n)o.call(n,s)&&(i[n[s]]=s);var c=t.exports={to:{},get:{}};function u(t,e,r){return Math.min(Math.max(e,t),r)}function l(t){var e=Math.round(t).toString(16).toUpperCase();return e.length<2?"0"+e:e}c.get=function(t){var e,r;switch(t.substring(0,3).toLowerCase()){case"hsl":e=c.get.hsl(t),r="hsl";break;case"hwb":e=c.get.hwb(t),r="hwb";break;default:e=c.get.rgb(t),r="rgb"}return e?{model:r,value:e}:null},c.get.rgb=function(t){if(!t)return null;var e,r,a,i=[0,0,0,1];if(e=t.match(/^#([a-f0-9]{6})([a-f0-9]{2})?$/i)){for(a=e[2],e=e[1],r=0;r<3;r++){var s=2*r;i[r]=parseInt(e.slice(s,s+2),16)}a&&(i[3]=parseInt(a,16)/255)}else if(e=t.match(/^#([a-f0-9]{3,4})$/i)){for(a=(e=e[1])[3],r=0;r<3;r++)i[r]=parseInt(e[r]+e[r],16);a&&(i[3]=parseInt(a+a,16)/255)}else if(e=t.match(/^rgba?\(\s*([+-]?\d+)(?=[\s,])\s*(?:,\s*)?([+-]?\d+)(?=[\s,])\s*(?:,\s*)?([+-]?\d+)\s*(?:[,|\/]\s*([+-]?[\d\.]+)(%?)\s*)?\)$/)){for(r=0;r<3;r++)i[r]=parseInt(e[r+1],0);e[4]&&(e[5]?i[3]=.01*parseFloat(e[4]):i[3]=parseFloat(e[4]))}else{if(!(e=t.match(/^rgba?\(\s*([+-]?[\d\.]+)\%\s*,?\s*([+-]?[\d\.]+)\%\s*,?\s*([+-]?[\d\.]+)\%\s*(?:[,|\/]\s*([+-]?[\d\.]+)(%?)\s*)?\)$/)))return(e=t.match(/^(\w+)$/))?"transparent"===e[1]?[0,0,0,0]:o.call(n,e[1])?((i=n[e[1]])[3]=1,i):null:null;for(r=0;r<3;r++)i[r]=Math.round(2.55*parseFloat(e[r+1]));e[4]&&(e[5]?i[3]=.01*parseFloat(e[4]):i[3]=parseFloat(e[4]))}for(r=0;r<3;r++)i[r]=u(i[r],0,255);return i[3]=u(i[3],0,1),i},c.get.hsl=function(t){if(!t)return null;var e=t.match(/^hsla?\(\s*([+-]?(?:\d{0,3}\.)?\d+)(?:deg)?\s*,?\s*([+-]?[\d\.]+)%\s*,?\s*([+-]?[\d\.]+)%\s*(?:[,|\/]\s*([+-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:[eE][+-]?\d+)?)\s*)?\)$/);if(e){var r=parseFloat(e[4]);return[(parseFloat(e[1])%360+360)%360,u(parseFloat(e[2]),0,100),u(parseFloat(e[3]),0,100),u(isNaN(r)?1:r,0,1)]}return null},c.get.hwb=function(t){if(!t)return null;var e=t.match(/^hwb\(\s*([+-]?\d{0,3}(?:\.\d+)?)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:[eE][+-]?\d+)?)\s*)?\)$/);if(e){var r=parseFloat(e[4]);return[(parseFloat(e[1])%360+360)%360,u(parseFloat(e[2]),0,100),u(parseFloat(e[3]),0,100),u(isNaN(r)?1:r,0,1)]}return null},c.to.hex=function(){var t=a(arguments);return"#"+l(t[0])+l(t[1])+l(t[2])+(t[3]<1?l(Math.round(255*t[3])):"")},c.to.rgb=function(){var t=a(arguments);return t.length<4||1===t[3]?"rgb("+Math.round(t[0])+", "+Math.round(t[1])+", "+Math.round(t[2])+")":"rgba("+Math.round(t[0])+", "+Math.round(t[1])+", "+Math.round(t[2])+", "+t[3]+")"},c.to.rgb.percent=function(){var t=a(arguments),e=Math.round(t[0]/255*100),r=Math.round(t[1]/255*100),n=Math.round(t[2]/255*100);return t.length<4||1===t[3]?"rgb("+e+"%, "+r+"%, "+n+"%)":"rgba("+e+"%, "+r+"%, "+n+"%, "+t[3]+")"},c.to.hsl=function(){var t=a(arguments);return t.length<4||1===t[3]?"hsl("+t[0]+", "+t[1]+"%, "+t[2]+"%)":"hsla("+t[0]+", "+t[1]+"%, "+t[2]+"%, "+t[3]+")"},c.to.hwb=function(){var t=a(arguments),e="";return t.length>=4&&1!==t[3]&&(e=", "+t[3]),"hwb("+t[0]+", "+t[1]+"%, "+t[2]+"%"+e+")"},c.to.keyword=function(t){return i[t.slice(0,3)]}},7124:(t,e,r)=>{const n=r(6855),a=r(7747),o=["keyword","gray","hex"],i={};for(const t of Object.keys(a))i[[...a[t].labels].sort().join("")]=t;const s={};function c(t,e){if(!(this instanceof c))return new c(t,e);if(e&&e in o&&(e=null),e&&!(e in a))throw new Error("Unknown model: "+e);let r,u;if(null==t)this.model="rgb",this.color=[0,0,0],this.valpha=1;else if(t instanceof c)this.model=t.model,this.color=[...t.color],this.valpha=t.valpha;else if("string"==typeof t){const e=n.get(t);if(null===e)throw new Error("Unable to parse color from string: "+t);this.model=e.model,u=a[this.model].channels,this.color=e.value.slice(0,u),this.valpha="number"==typeof e.value[u]?e.value[u]:1}else if(t.length>0){this.model=e||"rgb",u=a[this.model].channels;const r=Array.prototype.slice.call(t,0,u);this.color=h(r,u),this.valpha="number"==typeof t[u]?t[u]:1}else if("number"==typeof t)this.model="rgb",this.color=[t>>16&255,t>>8&255,255&t],this.valpha=1;else{this.valpha=1;const e=Object.keys(t);"alpha"in t&&(e.splice(e.indexOf("alpha"),1),this.valpha="number"==typeof t.alpha?t.alpha:0);const n=e.sort().join("");if(!(n in i))throw new Error("Unable to parse color from object: "+JSON.stringify(t));this.model=i[n];const{labels:o}=a[this.model],s=[];for(r=0;r<o.length;r++)s.push(t[o[r]]);this.color=h(s)}if(s[this.model])for(u=a[this.model].channels,r=0;r<u;r++){const t=s[this.model][r];t&&(this.color[r]=t(this.color[r]))}this.valpha=Math.max(0,Math.min(1,this.valpha)),Object.freeze&&Object.freeze(this)}c.prototype={toString(){return this.string()},toJSON(){return this[this.model]()},string(t){let e=this.model in n.to?this:this.rgb();e=e.round("number"==typeof t?t:1);const r=1===e.valpha?e.color:[...e.color,this.valpha];return n.to[e.model](r)},percentString(t){const e=this.rgb().round("number"==typeof t?t:1),r=1===e.valpha?e.color:[...e.color,this.valpha];return n.to.rgb.percent(r)},array(){return 1===this.valpha?[...this.color]:[...this.color,this.valpha]},object(){const t={},{channels:e}=a[this.model],{labels:r}=a[this.model];for(let n=0;n<e;n++)t[r[n]]=this.color[n];return 1!==this.valpha&&(t.alpha=this.valpha),t},unitArray(){const t=this.rgb().color;return t[0]/=255,t[1]/=255,t[2]/=255,1!==this.valpha&&t.push(this.valpha),t},unitObject(){const t=this.rgb().object();return t.r/=255,t.g/=255,t.b/=255,1!==this.valpha&&(t.alpha=this.valpha),t},round(t){return t=Math.max(t||0,0),new c([...this.color.map(u(t)),this.valpha],this.model)},alpha(t){return void 0!==t?new c([...this.color,Math.max(0,Math.min(1,t))],this.model):this.valpha},red:l("rgb",0,p(255)),green:l("rgb",1,p(255)),blue:l("rgb",2,p(255)),hue:l(["hsl","hsv","hsl","hwb","hcg"],0,(t=>(t%360+360)%360)),saturationl:l("hsl",1,p(100)),lightness:l("hsl",2,p(100)),saturationv:l("hsv",1,p(100)),value:l("hsv",2,p(100)),chroma:l("hcg",1,p(100)),gray:l("hcg",2,p(100)),white:l("hwb",1,p(100)),wblack:l("hwb",2,p(100)),cyan:l("cmyk",0,p(100)),magenta:l("cmyk",1,p(100)),yellow:l("cmyk",2,p(100)),black:l("cmyk",3,p(100)),x:l("xyz",0,p(95.047)),y:l("xyz",1,p(100)),z:l("xyz",2,p(108.833)),l:l("lab",0,p(100)),a:l("lab",1),b:l("lab",2),keyword(t){return void 0!==t?new c(t):a[this.model].keyword(this.color)},hex(t){return void 0!==t?new c(t):n.to.hex(this.rgb().round().color)},hexa(t){if(void 0!==t)return new c(t);const e=this.rgb().round().color;let r=Math.round(255*this.valpha).toString(16).toUpperCase();return 1===r.length&&(r="0"+r),n.to.hex(e)+r},rgbNumber(){const t=this.rgb().color;return(255&t[0])<<16|(255&t[1])<<8|255&t[2]},luminosity(){const t=this.rgb().color,e=[];for(const[r,n]of t.entries()){const t=n/255;e[r]=t<=.04045?t/12.92:((t+.055)/1.055)**2.4}return.2126*e[0]+.7152*e[1]+.0722*e[2]},contrast(t){const e=this.luminosity(),r=t.luminosity();return e>r?(e+.05)/(r+.05):(r+.05)/(e+.05)},level(t){const e=this.contrast(t);return e>=7?"AAA":e>=4.5?"AA":""},isDark(){const t=this.rgb().color;return(2126*t[0]+7152*t[1]+722*t[2])/1e4<128},isLight(){return!this.isDark()},negate(){const t=this.rgb();for(let e=0;e<3;e++)t.color[e]=255-t.color[e];return t},lighten(t){const e=this.hsl();return e.color[2]+=e.color[2]*t,e},darken(t){const e=this.hsl();return e.color[2]-=e.color[2]*t,e},saturate(t){const e=this.hsl();return e.color[1]+=e.color[1]*t,e},desaturate(t){const e=this.hsl();return e.color[1]-=e.color[1]*t,e},whiten(t){const e=this.hwb();return e.color[1]+=e.color[1]*t,e},blacken(t){const e=this.hwb();return e.color[2]+=e.color[2]*t,e},grayscale(){const t=this.rgb().color,e=.3*t[0]+.59*t[1]+.11*t[2];return c.rgb(e,e,e)},fade(t){return this.alpha(this.valpha-this.valpha*t)},opaquer(t){return this.alpha(this.valpha+this.valpha*t)},rotate(t){const e=this.hsl();let r=e.color[0];return r=(r+t)%360,r=r<0?360+r:r,e.color[0]=r,e},mix(t,e){if(!t||!t.rgb)throw new Error('Argument to "mix" was not a Color instance, but rather an instance of '+typeof t);const r=t.rgb(),n=this.rgb(),a=void 0===e?.5:e,o=2*a-1,i=r.alpha()-n.alpha(),s=((o*i==-1?o:(o+i)/(1+o*i))+1)/2,u=1-s;return c.rgb(s*r.red()+u*n.red(),s*r.green()+u*n.green(),s*r.blue()+u*n.blue(),r.alpha()*a+n.alpha()*(1-a))}};for(const t of Object.keys(a)){if(o.includes(t))continue;const{channels:e}=a[t];c.prototype[t]=function(...e){return this.model===t?new c(this):e.length>0?new c(e,t):new c([...(r=a[this.model][t].raw(this.color),Array.isArray(r)?r:[r]),this.valpha],t);var r},c[t]=function(...r){let n=r[0];return"number"==typeof n&&(n=h(r,e)),new c(n,t)}}function u(t){return function(e){return function(t,e){return Number(t.toFixed(e))}(e,t)}}function l(t,e,r){t=Array.isArray(t)?t:[t];for(const n of t)(s[n]||(s[n]=[]))[e]=r;return t=t[0],function(n){let a;return void 0!==n?(r&&(n=r(n)),a=this[t](),a.color[e]=n,a):(a=this[t]().color[e],r&&(a=r(a)),a)}}function p(t){return function(e){return Math.max(0,Math.min(t,e))}}function h(t,e){for(let r=0;r<e;r++)"number"!=typeof t[r]&&(t[r]=0);return t}t.exports=c},5043:(t,e,r)=>{const n=r(1086),a={};for(const t of Object.keys(n))a[n[t]]=t;const o={rgb:{channels:3,labels:"rgb"},hsl:{channels:3,labels:"hsl"},hsv:{channels:3,labels:"hsv"},hwb:{channels:3,labels:"hwb"},cmyk:{channels:4,labels:"cmyk"},xyz:{channels:3,labels:"xyz"},lab:{channels:3,labels:"lab"},lch:{channels:3,labels:"lch"},hex:{channels:1,labels:["hex"]},keyword:{channels:1,labels:["keyword"]},ansi16:{channels:1,labels:["ansi16"]},ansi256:{channels:1,labels:["ansi256"]},hcg:{channels:3,labels:["h","c","g"]},apple:{channels:3,labels:["r16","g16","b16"]},gray:{channels:1,labels:["gray"]}};t.exports=o;for(const t of Object.keys(o)){if(!("channels"in o[t]))throw new Error("missing channels property: "+t);if(!("labels"in o[t]))throw new Error("missing channel labels property: "+t);if(o[t].labels.length!==o[t].channels)throw new Error("channel and label counts mismatch: "+t);const{channels:e,labels:r}=o[t];delete o[t].channels,delete o[t].labels,Object.defineProperty(o[t],"channels",{value:e}),Object.defineProperty(o[t],"labels",{value:r})}o.rgb.hsl=function(t){const e=t[0]/255,r=t[1]/255,n=t[2]/255,a=Math.min(e,r,n),o=Math.max(e,r,n),i=o-a;let s,c;o===a?s=0:e===o?s=(r-n)/i:r===o?s=2+(n-e)/i:n===o&&(s=4+(e-r)/i),s=Math.min(60*s,360),s<0&&(s+=360);const u=(a+o)/2;return c=o===a?0:u<=.5?i/(o+a):i/(2-o-a),[s,100*c,100*u]},o.rgb.hsv=function(t){let e,r,n,a,o;const i=t[0]/255,s=t[1]/255,c=t[2]/255,u=Math.max(i,s,c),l=u-Math.min(i,s,c),p=function(t){return(u-t)/6/l+.5};return 0===l?(a=0,o=0):(o=l/u,e=p(i),r=p(s),n=p(c),i===u?a=n-r:s===u?a=1/3+e-n:c===u&&(a=2/3+r-e),a<0?a+=1:a>1&&(a-=1)),[360*a,100*o,100*u]},o.rgb.hwb=function(t){const e=t[0],r=t[1];let n=t[2];const a=o.rgb.hsl(t)[0],i=1/255*Math.min(e,Math.min(r,n));return n=1-1/255*Math.max(e,Math.max(r,n)),[a,100*i,100*n]},o.rgb.cmyk=function(t){const e=t[0]/255,r=t[1]/255,n=t[2]/255,a=Math.min(1-e,1-r,1-n);return[100*((1-e-a)/(1-a)||0),100*((1-r-a)/(1-a)||0),100*((1-n-a)/(1-a)||0),100*a]},o.rgb.keyword=function(t){const e=a[t];if(e)return e;let r,o=1/0;for(const e of Object.keys(n)){const a=n[e],c=(s=a,((i=t)[0]-s[0])**2+(i[1]-s[1])**2+(i[2]-s[2])**2);c<o&&(o=c,r=e)}var i,s;return r},o.keyword.rgb=function(t){return n[t]},o.rgb.xyz=function(t){let e=t[0]/255,r=t[1]/255,n=t[2]/255;e=e>.04045?((e+.055)/1.055)**2.4:e/12.92,r=r>.04045?((r+.055)/1.055)**2.4:r/12.92,n=n>.04045?((n+.055)/1.055)**2.4:n/12.92;return[100*(.4124*e+.3576*r+.1805*n),100*(.2126*e+.7152*r+.0722*n),100*(.0193*e+.1192*r+.9505*n)]},o.rgb.lab=function(t){const e=o.rgb.xyz(t);let r=e[0],n=e[1],a=e[2];r/=95.047,n/=100,a/=108.883,r=r>.008856?r**(1/3):7.787*r+16/116,n=n>.008856?n**(1/3):7.787*n+16/116,a=a>.008856?a**(1/3):7.787*a+16/116;return[116*n-16,500*(r-n),200*(n-a)]},o.hsl.rgb=function(t){const e=t[0]/360,r=t[1]/100,n=t[2]/100;let a,o,i;if(0===r)return i=255*n,[i,i,i];a=n<.5?n*(1+r):n+r-n*r;const s=2*n-a,c=[0,0,0];for(let t=0;t<3;t++)o=e+1/3*-(t-1),o<0&&o++,o>1&&o--,i=6*o<1?s+6*(a-s)*o:2*o<1?a:3*o<2?s+(a-s)*(2/3-o)*6:s,c[t]=255*i;return c},o.hsl.hsv=function(t){const e=t[0];let r=t[1]/100,n=t[2]/100,a=r;const o=Math.max(n,.01);n*=2,r*=n<=1?n:2-n,a*=o<=1?o:2-o;return[e,100*(0===n?2*a/(o+a):2*r/(n+r)),100*((n+r)/2)]},o.hsv.rgb=function(t){const e=t[0]/60,r=t[1]/100;let n=t[2]/100;const a=Math.floor(e)%6,o=e-Math.floor(e),i=255*n*(1-r),s=255*n*(1-r*o),c=255*n*(1-r*(1-o));switch(n*=255,a){case 0:return[n,c,i];case 1:return[s,n,i];case 2:return[i,n,c];case 3:return[i,s,n];case 4:return[c,i,n];case 5:return[n,i,s]}},o.hsv.hsl=function(t){const e=t[0],r=t[1]/100,n=t[2]/100,a=Math.max(n,.01);let o,i;i=(2-r)*n;const s=(2-r)*a;return o=r*a,o/=s<=1?s:2-s,o=o||0,i/=2,[e,100*o,100*i]},o.hwb.rgb=function(t){const e=t[0]/360;let r=t[1]/100,n=t[2]/100;const a=r+n;let o;a>1&&(r/=a,n/=a);const i=Math.floor(6*e),s=1-n;o=6*e-i,0!=(1&i)&&(o=1-o);const c=r+o*(s-r);let u,l,p;switch(i){default:case 6:case 0:u=s,l=c,p=r;break;case 1:u=c,l=s,p=r;break;case 2:u=r,l=s,p=c;break;case 3:u=r,l=c,p=s;break;case 4:u=c,l=r,p=s;break;case 5:u=s,l=r,p=c}return[255*u,255*l,255*p]},o.cmyk.rgb=function(t){const e=t[0]/100,r=t[1]/100,n=t[2]/100,a=t[3]/100;return[255*(1-Math.min(1,e*(1-a)+a)),255*(1-Math.min(1,r*(1-a)+a)),255*(1-Math.min(1,n*(1-a)+a))]},o.xyz.rgb=function(t){const e=t[0]/100,r=t[1]/100,n=t[2]/100;let a,o,i;return a=3.2406*e+-1.5372*r+-.4986*n,o=-.9689*e+1.8758*r+.0415*n,i=.0557*e+-.204*r+1.057*n,a=a>.0031308?1.055*a**(1/2.4)-.055:12.92*a,o=o>.0031308?1.055*o**(1/2.4)-.055:12.92*o,i=i>.0031308?1.055*i**(1/2.4)-.055:12.92*i,a=Math.min(Math.max(0,a),1),o=Math.min(Math.max(0,o),1),i=Math.min(Math.max(0,i),1),[255*a,255*o,255*i]},o.xyz.lab=function(t){let e=t[0],r=t[1],n=t[2];e/=95.047,r/=100,n/=108.883,e=e>.008856?e**(1/3):7.787*e+16/116,r=r>.008856?r**(1/3):7.787*r+16/116,n=n>.008856?n**(1/3):7.787*n+16/116;return[116*r-16,500*(e-r),200*(r-n)]},o.lab.xyz=function(t){let e,r,n;r=(t[0]+16)/116,e=t[1]/500+r,n=r-t[2]/200;const a=r**3,o=e**3,i=n**3;return r=a>.008856?a:(r-16/116)/7.787,e=o>.008856?o:(e-16/116)/7.787,n=i>.008856?i:(n-16/116)/7.787,e*=95.047,r*=100,n*=108.883,[e,r,n]},o.lab.lch=function(t){const e=t[0],r=t[1],n=t[2];let a;a=360*Math.atan2(n,r)/2/Math.PI,a<0&&(a+=360);return[e,Math.sqrt(r*r+n*n),a]},o.lch.lab=function(t){const e=t[0],r=t[1],n=t[2]/360*2*Math.PI;return[e,r*Math.cos(n),r*Math.sin(n)]},o.rgb.ansi16=function(t,e=null){const[r,n,a]=t;let i=null===e?o.rgb.hsv(t)[2]:e;if(i=Math.round(i/50),0===i)return 30;let s=30+(Math.round(a/255)<<2|Math.round(n/255)<<1|Math.round(r/255));return 2===i&&(s+=60),s},o.hsv.ansi16=function(t){return o.rgb.ansi16(o.hsv.rgb(t),t[2])},o.rgb.ansi256=function(t){const e=t[0],r=t[1],n=t[2];if(e===r&&r===n)return e<8?16:e>248?231:Math.round((e-8)/247*24)+232;return 16+36*Math.round(e/255*5)+6*Math.round(r/255*5)+Math.round(n/255*5)},o.ansi16.rgb=function(t){let e=t%10;if(0===e||7===e)return t>50&&(e+=3.5),e=e/10.5*255,[e,e,e];const r=.5*(1+~~(t>50));return[(1&e)*r*255,(e>>1&1)*r*255,(e>>2&1)*r*255]},o.ansi256.rgb=function(t){if(t>=232){const e=10*(t-232)+8;return[e,e,e]}let e;t-=16;return[Math.floor(t/36)/5*255,Math.floor((e=t%36)/6)/5*255,e%6/5*255]},o.rgb.hex=function(t){const e=(((255&Math.round(t[0]))<<16)+((255&Math.round(t[1]))<<8)+(255&Math.round(t[2]))).toString(16).toUpperCase();return"000000".substring(e.length)+e},o.hex.rgb=function(t){const e=t.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);if(!e)return[0,0,0];let r=e[0];3===e[0].length&&(r=r.split("").map((t=>t+t)).join(""));const n=parseInt(r,16);return[n>>16&255,n>>8&255,255&n]},o.rgb.hcg=function(t){const e=t[0]/255,r=t[1]/255,n=t[2]/255,a=Math.max(Math.max(e,r),n),o=Math.min(Math.min(e,r),n),i=a-o;let s,c;return s=i<1?o/(1-i):0,c=i<=0?0:a===e?(r-n)/i%6:a===r?2+(n-e)/i:4+(e-r)/i,c/=6,c%=1,[360*c,100*i,100*s]},o.hsl.hcg=function(t){const e=t[1]/100,r=t[2]/100,n=r<.5?2*e*r:2*e*(1-r);let a=0;return n<1&&(a=(r-.5*n)/(1-n)),[t[0],100*n,100*a]},o.hsv.hcg=function(t){const e=t[1]/100,r=t[2]/100,n=e*r;let a=0;return n<1&&(a=(r-n)/(1-n)),[t[0],100*n,100*a]},o.hcg.rgb=function(t){const e=t[0]/360,r=t[1]/100,n=t[2]/100;if(0===r)return[255*n,255*n,255*n];const a=[0,0,0],o=e%1*6,i=o%1,s=1-i;let c=0;switch(Math.floor(o)){case 0:a[0]=1,a[1]=i,a[2]=0;break;case 1:a[0]=s,a[1]=1,a[2]=0;break;case 2:a[0]=0,a[1]=1,a[2]=i;break;case 3:a[0]=0,a[1]=s,a[2]=1;break;case 4:a[0]=i,a[1]=0,a[2]=1;break;default:a[0]=1,a[1]=0,a[2]=s}return c=(1-r)*n,[255*(r*a[0]+c),255*(r*a[1]+c),255*(r*a[2]+c)]},o.hcg.hsv=function(t){const e=t[1]/100,r=e+t[2]/100*(1-e);let n=0;return r>0&&(n=e/r),[t[0],100*n,100*r]},o.hcg.hsl=function(t){const e=t[1]/100,r=t[2]/100*(1-e)+.5*e;let n=0;return r>0&&r<.5?n=e/(2*r):r>=.5&&r<1&&(n=e/(2*(1-r))),[t[0],100*n,100*r]},o.hcg.hwb=function(t){const e=t[1]/100,r=e+t[2]/100*(1-e);return[t[0],100*(r-e),100*(1-r)]},o.hwb.hcg=function(t){const e=t[1]/100,r=1-t[2]/100,n=r-e;let a=0;return n<1&&(a=(r-n)/(1-n)),[t[0],100*n,100*a]},o.apple.rgb=function(t){return[t[0]/65535*255,t[1]/65535*255,t[2]/65535*255]},o.rgb.apple=function(t){return[t[0]/255*65535,t[1]/255*65535,t[2]/255*65535]},o.gray.rgb=function(t){return[t[0]/100*255,t[0]/100*255,t[0]/100*255]},o.gray.hsl=function(t){return[0,0,t[0]]},o.gray.hsv=o.gray.hsl,o.gray.hwb=function(t){return[0,100,t[0]]},o.gray.cmyk=function(t){return[0,0,0,t[0]]},o.gray.lab=function(t){return[t[0],0,0]},o.gray.hex=function(t){const e=255&Math.round(t[0]/100*255),r=((e<<16)+(e<<8)+e).toString(16).toUpperCase();return"000000".substring(r.length)+r},o.rgb.gray=function(t){return[(t[0]+t[1]+t[2])/3/255*100]}},7747:(t,e,r)=>{const n=r(5043),a=r(8074),o={};Object.keys(n).forEach((t=>{o[t]={},Object.defineProperty(o[t],"channels",{value:n[t].channels}),Object.defineProperty(o[t],"labels",{value:n[t].labels});const e=a(t);Object.keys(e).forEach((r=>{const n=e[r];o[t][r]=function(t){const e=function(...e){const r=e[0];if(null==r)return r;r.length>1&&(e=r);const n=t(e);if("object"==typeof n)for(let t=n.length,e=0;e<t;e++)n[e]=Math.round(n[e]);return n};return"conversion"in t&&(e.conversion=t.conversion),e}(n),o[t][r].raw=function(t){const e=function(...e){const r=e[0];return null==r?r:(r.length>1&&(e=r),t(e))};return"conversion"in t&&(e.conversion=t.conversion),e}(n)}))})),t.exports=o},8074:(t,e,r)=>{const n=r(5043);function a(t){const e=function(){const t={},e=Object.keys(n);for(let r=e.length,n=0;n<r;n++)t[e[n]]={distance:-1,parent:null};return t}(),r=[t];for(e[t].distance=0;r.length;){const t=r.pop(),a=Object.keys(n[t]);for(let n=a.length,o=0;o<n;o++){const n=a[o],i=e[n];-1===i.distance&&(i.distance=e[t].distance+1,i.parent=t,r.unshift(n))}}return e}function o(t,e){return function(r){return e(t(r))}}function i(t,e){const r=[e[t].parent,t];let a=n[e[t].parent][t],i=e[t].parent;for(;e[i].parent;)r.unshift(e[i].parent),a=o(n[e[i].parent][i],a),i=e[i].parent;return a.conversion=r,a}t.exports=function(t){const e=a(t),r={},n=Object.keys(e);for(let t=n.length,a=0;a<t;a++){const t=n[a];null!==e[t].parent&&(r[t]=i(t,e))}return r}},1086:t=>{"use strict";t.exports={aliceblue:[240,248,255],antiquewhite:[250,235,215],aqua:[0,255,255],aquamarine:[127,255,212],azure:[240,255,255],beige:[245,245,220],bisque:[255,228,196],black:[0,0,0],blanchedalmond:[255,235,205],blue:[0,0,255],blueviolet:[138,43,226],brown:[165,42,42],burlywood:[222,184,135],cadetblue:[95,158,160],chartreuse:[127,255,0],chocolate:[210,105,30],coral:[255,127,80],cornflowerblue:[100,149,237],cornsilk:[255,248,220],crimson:[220,20,60],cyan:[0,255,255],darkblue:[0,0,139],darkcyan:[0,139,139],darkgoldenrod:[184,134,11],darkgray:[169,169,169],darkgreen:[0,100,0],darkgrey:[169,169,169],darkkhaki:[189,183,107],darkmagenta:[139,0,139],darkolivegreen:[85,107,47],darkorange:[255,140,0],darkorchid:[153,50,204],darkred:[139,0,0],darksalmon:[233,150,122],darkseagreen:[143,188,143],darkslateblue:[72,61,139],darkslategray:[47,79,79],darkslategrey:[47,79,79],darkturquoise:[0,206,209],darkviolet:[148,0,211],deeppink:[255,20,147],deepskyblue:[0,191,255],dimgray:[105,105,105],dimgrey:[105,105,105],dodgerblue:[30,144,255],firebrick:[178,34,34],floralwhite:[255,250,240],forestgreen:[34,139,34],fuchsia:[255,0,255],gainsboro:[220,220,220],ghostwhite:[248,248,255],gold:[255,215,0],goldenrod:[218,165,32],gray:[128,128,128],green:[0,128,0],greenyellow:[173,255,47],grey:[128,128,128],honeydew:[240,255,240],hotpink:[255,105,180],indianred:[205,92,92],indigo:[75,0,130],ivory:[255,255,240],khaki:[240,230,140],lavender:[230,230,250],lavenderblush:[255,240,245],lawngreen:[124,252,0],lemonchiffon:[255,250,205],lightblue:[173,216,230],lightcoral:[240,128,128],lightcyan:[224,255,255],lightgoldenrodyellow:[250,250,210],lightgray:[211,211,211],lightgreen:[144,238,144],lightgrey:[211,211,211],lightpink:[255,182,193],lightsalmon:[255,160,122],lightseagreen:[32,178,170],lightskyblue:[135,206,250],lightslategray:[119,136,153],lightslategrey:[119,136,153],lightsteelblue:[176,196,222],lightyellow:[255,255,224],lime:[0,255,0],limegreen:[50,205,50],linen:[250,240,230],magenta:[255,0,255],maroon:[128,0,0],mediumaquamarine:[102,205,170],mediumblue:[0,0,205],mediumorchid:[186,85,211],mediumpurple:[147,112,219],mediumseagreen:[60,179,113],mediumslateblue:[123,104,238],mediumspringgreen:[0,250,154],mediumturquoise:[72,209,204],mediumvioletred:[199,21,133],midnightblue:[25,25,112],mintcream:[245,255,250],mistyrose:[255,228,225],moccasin:[255,228,181],navajowhite:[255,222,173],navy:[0,0,128],oldlace:[253,245,230],olive:[128,128,0],olivedrab:[107,142,35],orange:[255,165,0],orangered:[255,69,0],orchid:[218,112,214],palegoldenrod:[238,232,170],palegreen:[152,251,152],paleturquoise:[175,238,238],palevioletred:[219,112,147],papayawhip:[255,239,213],peachpuff:[255,218,185],peru:[205,133,63],pink:[255,192,203],plum:[221,160,221],powderblue:[176,224,230],purple:[128,0,128],rebeccapurple:[102,51,153],red:[255,0,0],rosybrown:[188,143,143],royalblue:[65,105,225],saddlebrown:[139,69,19],salmon:[250,128,114],sandybrown:[244,164,96],seagreen:[46,139,87],seashell:[255,245,238],sienna:[160,82,45],silver:[192,192,192],skyblue:[135,206,235],slateblue:[106,90,205],slategray:[112,128,144],slategrey:[112,128,144],snow:[255,250,250],springgreen:[0,255,127],steelblue:[70,130,180],tan:[210,180,140],teal:[0,128,128],thistle:[216,191,216],tomato:[255,99,71],turquoise:[64,224,208],violet:[238,130,238],wheat:[245,222,179],white:[255,255,255],whitesmoke:[245,245,245],yellow:[255,255,0],yellowgreen:[154,205,50]}},5089:(t,e,r)=>{var n=r(930),a=r(9268),o=TypeError;t.exports=function(t){if(n(t))return t;throw o(a(t)+" is not a function")}},1449:(t,e,r)=>{var n=r(1956),a=r(9268),o=TypeError;t.exports=function(t){if(n(t))return t;throw o(a(t)+" is not a constructor")}},1378:(t,e,r)=>{var n=r(930),a=String,o=TypeError;t.exports=function(t){if("object"==typeof t||n(t))return t;throw o("Can't set "+a(t)+" as a prototype")}},8669:(t,e,r)=>{var n=r(211),a=r(4710),o=r(7826).f,i=n("unscopables"),s=Array.prototype;null==s[i]&&o(s,i,{configurable:!0,value:a(null)}),t.exports=function(t){s[i][t]=!0}},9966:(t,e,r)=>{"use strict";var n=r(3448).charAt;t.exports=function(t,e,r){return e+(r?n(t,e).length:1)}},6112:(t,e,r)=>{var n=r(8759),a=String,o=TypeError;t.exports=function(t){if(n(t))return t;throw o(a(t)+" is not an object")}},1005:(t,e,r)=>{var n=r(3677);t.exports=n((function(){if("function"==typeof ArrayBuffer){var t=new ArrayBuffer(8);Object.isExtensible(t)&&Object.defineProperty(t,"a",{value:8})}}))},1984:(t,e,r)=>{"use strict";var n=r(8062).forEach,a=r(2802)("forEach");t.exports=a?[].forEach:function(t){return n(this,t,arguments.length>1?arguments[1]:void 0)}},1842:(t,e,r)=>{"use strict";var n=r(8516),a=r(9413),o=r(3060),i=r(7850),s=r(2814),c=r(1956),u=r(2871),l=r(9720),p=r(3546),h=r(1667),d=Array;t.exports=function(t){var e=o(t),r=c(this),f=arguments.length,v=f>1?arguments[1]:void 0,m=void 0!==v;m&&(v=n(v,f>2?arguments[2]:void 0));var b,g,y,k,w,C,S=h(e),x=0;if(!S||this===d&&s(S))for(b=u(e),g=r?new this(b):d(b);b>x;x++)C=m?v(e[x],x):e[x],l(g,x,C);else for(w=(k=p(e,S)).next,g=r?new this:[];!(y=a(w,k)).done;x++)C=m?i(k,v,[y.value,x],!0):y.value,l(g,x,C);return g.length=x,g}},6198:(t,e,r)=>{var n=r(4088),a=r(7740),o=r(2871),i=function(t){return function(e,r,i){var s,c=n(e),u=o(c),l=a(i,u);if(t&&r!=r){for(;u>l;)if((s=c[l++])!=s)return!0}else for(;u>l;l++)if((t||l in c)&&c[l]===r)return t||l||0;return!t&&-1}};t.exports={includes:i(!0),indexOf:i(!1)}},8062:(t,e,r)=>{var n=r(8516),a=r(8240),o=r(5974),i=r(3060),s=r(2871),c=r(5574),u=a([].push),l=function(t){var e=1==t,r=2==t,a=3==t,l=4==t,p=6==t,h=7==t,d=5==t||p;return function(f,v,m,b){for(var g,y,k=i(f),w=o(k),C=n(v,m),S=s(w),x=0,O=b||c,E=e?O(f,S):r||h?O(f,0):void 0;S>x;x++)if((d||x in w)&&(y=C(g=w[x],x,k),t))if(e)E[x]=y;else if(y)switch(t){case 3:return!0;case 5:return g;case 6:return x;case 2:u(E,g)}else switch(t){case 4:return!1;case 7:u(E,g)}return p?-1:a||l?l:E}};t.exports={forEach:l(0),map:l(1),filter:l(2),some:l(3),every:l(4),find:l(5),findIndex:l(6),filterReject:l(7)}},9955:(t,e,r)=>{var n=r(3677),a=r(211),o=r(1448),i=a("species");t.exports=function(t){return o>=51||!n((function(){var e=[];return(e.constructor={})[i]=function(){return{foo:1}},1!==e[t](Boolean).foo}))}},2802:(t,e,r)=>{"use strict";var n=r(3677);t.exports=function(t,e){var r=[][t];return!!r&&n((function(){r.call(null,e||function(){return 1},1)}))}},3329:(t,e,r)=>{var n=r(7740),a=r(2871),o=r(9720),i=Array,s=Math.max;t.exports=function(t,e,r){for(var c=a(t),u=n(e,c),l=n(void 0===r?c:r,c),p=i(s(l-u,0)),h=0;u<l;u++,h++)o(p,h,t[u]);return p.length=h,p}},745:(t,e,r)=>{var n=r(8240);t.exports=n([].slice)},8789:(t,e,r)=>{var n=r(6526),a=r(1956),o=r(8759),i=r(211)("species"),s=Array;t.exports=function(t){var e;return n(t)&&(e=t.constructor,(a(e)&&(e===s||n(e.prototype))||o(e)&&null===(e=e[i]))&&(e=void 0)),void 0===e?s:e}},5574:(t,e,r)=>{var n=r(8789);t.exports=function(t,e){return new(n(t))(0===e?0:e)}},7850:(t,e,r)=>{var n=r(6112),a=r(6737);t.exports=function(t,e,r,o){try{return o?e(n(r)[0],r[1]):e(r)}catch(e){a(t,"throw",e)}}},8939:(t,e,r)=>{var n=r(211)("iterator"),a=!1;try{var o=0,i={next:function(){return{done:!!o++}},return:function(){a=!0}};i[n]=function(){return this},Array.from(i,(function(){throw 2}))}catch(t){}t.exports=function(t,e){if(!e&&!a)return!1;var r=!1;try{var o={};o[n]=function(){return{next:function(){return{done:r=!0}}}},t(o)}catch(t){}return r}},2306:(t,e,r)=>{var n=r(8240),a=n({}.toString),o=n("".slice);t.exports=function(t){return o(a(t),8,-1)}},375:(t,e,r)=>{var n=r(2371),a=r(930),o=r(2306),i=r(211)("toStringTag"),s=Object,c="Arguments"==o(function(){return arguments}());t.exports=n?o:function(t){var e,r,n;return void 0===t?"Undefined":null===t?"Null":"string"==typeof(r=function(t,e){try{return t[e]}catch(t){}}(e=s(t),i))?r:c?o(e):"Object"==(n=o(e))&&a(e.callee)?"Arguments":n}},8474:(t,e,r)=>{var n=r(9606),a=r(6095),o=r(4399),i=r(7826);t.exports=function(t,e,r){for(var s=a(e),c=i.f,u=o.f,l=0;l<s.length;l++){var p=s[l];n(t,p)||r&&n(r,p)||c(t,p,u(e,p))}}},7209:(t,e,r)=>{var n=r(3677);t.exports=!n((function(){function t(){}return t.prototype.constructor=null,Object.getPrototypeOf(new t)!==t.prototype}))},471:(t,e,r)=>{"use strict";var n=r(3083).IteratorPrototype,a=r(4710),o=r(5736),i=r(914),s=r(7719),c=function(){return this};t.exports=function(t,e,r,u){var l=e+" Iterator";return t.prototype=a(n,{next:o(+!u,r)}),i(t,l,!1,!0),s[l]=c,t}},2585:(t,e,r)=>{var n=r(5283),a=r(7826),o=r(5736);t.exports=n?function(t,e,r){return a.f(t,e,o(1,r))}:function(t,e,r){return t[e]=r,t}},5736:t=>{t.exports=function(t,e){return{enumerable:!(1&t),configurable:!(2&t),writable:!(4&t),value:e}}},9720:(t,e,r)=>{"use strict";var n=r(2258),a=r(7826),o=r(5736);t.exports=function(t,e,r){var i=n(e);i in t?a.f(t,i,o(0,r)):t[i]=r}},1343:(t,e,r)=>{var n=r(930),a=r(7826),o=r(3712),i=r(9444);t.exports=function(t,e,r,s){s||(s={});var c=s.enumerable,u=void 0!==s.name?s.name:e;if(n(r)&&o(r,u,s),s.global)c?t[e]=r:i(e,r);else{try{s.unsafe?t[e]&&(c=!0):delete t[e]}catch(t){}c?t[e]=r:a.f(t,e,{value:r,enumerable:!1,configurable:!s.nonConfigurable,writable:!s.nonWritable})}return t}},9444:(t,e,r)=>{var n=r(2086),a=Object.defineProperty;t.exports=function(t,e){try{a(n,t,{value:e,configurable:!0,writable:!0})}catch(r){n[t]=e}return e}},8432:(t,e,r)=>{"use strict";var n=r(1695),a=r(9413),o=r(3296),i=r(4398),s=r(930),c=r(471),u=r(2130),l=r(7530),p=r(914),h=r(2585),d=r(1343),f=r(211),v=r(7719),m=r(3083),b=i.PROPER,g=i.CONFIGURABLE,y=m.IteratorPrototype,k=m.BUGGY_SAFARI_ITERATORS,w=f("iterator"),C="keys",S="values",x="entries",O=function(){return this};t.exports=function(t,e,r,i,f,m,E){c(r,e,i);var L,P,A,T=function(t){if(t===f&&F)return F;if(!k&&t in M)return M[t];switch(t){case C:case S:case x:return function(){return new r(this,t)}}return function(){return new r(this)}},j=e+" Iterator",I=!1,M=t.prototype,B=M[w]||M["@@iterator"]||f&&M[f],F=!k&&B||T(f),R="Array"==e&&M.entries||B;if(R&&(L=u(R.call(new t)))!==Object.prototype&&L.next&&(o||u(L)===y||(l?l(L,y):s(L[w])||d(L,w,O)),p(L,j,!0,!0),o&&(v[j]=O)),b&&f==S&&B&&B.name!==S&&(!o&&g?h(M,"name",S):(I=!0,F=function(){return a(B,this)})),f)if(P={values:T(S),keys:m?F:T(C),entries:T(x)},E)for(A in P)(k||I||!(A in M))&&d(M,A,P[A]);else n({target:e,proto:!0,forced:k||I},P);return o&&!E||M[w]===F||d(M,w,F,{name:f}),v[e]=F,P}},4145:(t,e,r)=>{var n=r(9775),a=r(9606),o=r(9251),i=r(7826).f;t.exports=function(t){var e=n.Symbol||(n.Symbol={});a(e,t)||i(e,t,{value:o.f(t)})}},5283:(t,e,r)=>{var n=r(3677);t.exports=!n((function(){return 7!=Object.defineProperty({},1,{get:function(){return 7}})[1]}))},821:(t,e,r)=>{var n=r(2086),a=r(8759),o=n.document,i=a(o)&&a(o.createElement);t.exports=function(t){return i?o.createElement(t):{}}},7620:t=>{var e=TypeError;t.exports=function(t){if(t>9007199254740991)throw e("Maximum allowed index exceeded");return t}},933:t=>{t.exports={CSSRuleList:0,CSSStyleDeclaration:0,CSSValueList:0,ClientRectList:0,DOMRectList:0,DOMStringList:0,DOMTokenList:1,DataTransferItemList:0,FileList:0,HTMLAllCollection:0,HTMLCollection:0,HTMLFormElement:0,HTMLSelectElement:0,MediaList:0,MimeTypeArray:0,NamedNodeMap:0,NodeList:1,PaintRequestList:0,Plugin:0,PluginArray:0,SVGLengthList:0,SVGNumberList:0,SVGPathSegList:0,SVGPointList:0,SVGStringList:0,SVGTransformList:0,SourceBufferList:0,StyleSheetList:0,TextTrackCueList:0,TextTrackList:0,TouchList:0}},3526:(t,e,r)=>{var n=r(821)("span").classList,a=n&&n.constructor&&n.constructor.prototype;t.exports=a===Object.prototype?void 0:a},4999:(t,e,r)=>{var n=r(563);t.exports=n("navigator","userAgent")||""},1448:(t,e,r)=>{var n,a,o=r(2086),i=r(4999),s=o.process,c=o.Deno,u=s&&s.versions||c&&c.version,l=u&&u.v8;l&&(a=(n=l.split("."))[0]>0&&n[0]<4?1:+(n[0]+n[1])),!a&&i&&(!(n=i.match(/Edge\/(\d+)/))||n[1]>=74)&&(n=i.match(/Chrome\/(\d+)/))&&(a=+n[1]),t.exports=a},8684:t=>{t.exports=["constructor","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","toLocaleString","toString","valueOf"]},1695:(t,e,r)=>{var n=r(2086),a=r(4399).f,o=r(2585),i=r(1343),s=r(9444),c=r(8474),u=r(7189);t.exports=function(t,e){var r,l,p,h,d,f=t.target,v=t.global,m=t.stat;if(r=v?n:m?n[f]||s(f,{}):(n[f]||{}).prototype)for(l in e){if(h=e[l],p=t.dontCallGetSet?(d=a(r,l))&&d.value:r[l],!u(v?l:f+(m?".":"#")+l,t.forced)&&void 0!==p){if(typeof h==typeof p)continue;c(h,p)}(t.sham||p&&p.sham)&&o(h,"sham",!0),i(r,l,h,t)}}},3677:t=>{t.exports=function(t){try{return!!t()}catch(t){return!0}}},2331:(t,e,r)=>{"use strict";r(2077);var n=r(8240),a=r(1343),o=r(4861),i=r(3677),s=r(211),c=r(2585),u=s("species"),l=RegExp.prototype;t.exports=function(t,e,r,p){var h=s(t),d=!i((function(){var e={};return e[h]=function(){return 7},7!=""[t](e)})),f=d&&!i((function(){var e=!1,r=/a/;return"split"===t&&((r={}).constructor={},r.constructor[u]=function(){return r},r.flags="",r[h]=/./[h]),r.exec=function(){return e=!0,null},r[h](""),!e}));if(!d||!f||r){var v=n(/./[h]),m=e(h,""[t],(function(t,e,r,a,i){var s=n(t),c=e.exec;return c===o||c===l.exec?d&&!i?{done:!0,value:v(e,r,a)}:{done:!0,value:s(r,e,a)}:{done:!1}}));a(String.prototype,t,m[0]),a(l,h,m[1])}p&&c(l[h],"sham",!0)}},6910:(t,e,r)=>{var n=r(3677);t.exports=!n((function(){return Object.isExtensible(Object.preventExtensions({}))}))},7258:(t,e,r)=>{var n=r(6059),a=Function.prototype,o=a.apply,i=a.call;t.exports="object"==typeof Reflect&&Reflect.apply||(n?i.bind(o):function(){return i.apply(o,arguments)})},8516:(t,e,r)=>{var n=r(8240),a=r(5089),o=r(6059),i=n(n.bind);t.exports=function(t,e){return a(t),void 0===e?t:o?i(t,e):function(){return t.apply(e,arguments)}}},6059:(t,e,r)=>{var n=r(3677);t.exports=!n((function(){var t=function(){}.bind();return"function"!=typeof t||t.hasOwnProperty("prototype")}))},2395:(t,e,r)=>{"use strict";var n=r(8240),a=r(5089),o=r(8759),i=r(9606),s=r(745),c=r(6059),u=Function,l=n([].concat),p=n([].join),h={},d=function(t,e,r){if(!i(h,e)){for(var n=[],a=0;a<e;a++)n[a]="a["+a+"]";h[e]=u("C,a","return new C("+p(n,",")+")")}return h[e](t,r)};t.exports=c?u.bind:function(t){var e=a(this),r=e.prototype,n=s(arguments,1),i=function(){var r=l(n,s(arguments));return this instanceof i?d(e,r.length,r):e.apply(t,r)};return o(r)&&(i.prototype=r),i}},9413:(t,e,r)=>{var n=r(6059),a=Function.prototype.call;t.exports=n?a.bind(a):function(){return a.apply(a,arguments)}},4398:(t,e,r)=>{var n=r(5283),a=r(9606),o=Function.prototype,i=n&&Object.getOwnPropertyDescriptor,s=a(o,"name"),c=s&&"something"===function(){}.name,u=s&&(!n||n&&i(o,"name").configurable);t.exports={EXISTS:s,PROPER:c,CONFIGURABLE:u}},8240:(t,e,r)=>{var n=r(6059),a=Function.prototype,o=a.bind,i=a.call,s=n&&o.bind(i,i);t.exports=n?function(t){return t&&s(t)}:function(t){return t&&function(){return i.apply(t,arguments)}}},563:(t,e,r)=>{var n=r(2086),a=r(930),o=function(t){return a(t)?t:void 0};t.exports=function(t,e){return arguments.length<2?o(n[t]):n[t]&&n[t][e]}},1667:(t,e,r)=>{var n=r(375),a=r(2964),o=r(7719),i=r(211)("iterator");t.exports=function(t){if(null!=t)return a(t,i)||a(t,"@@iterator")||o[n(t)]}},3546:(t,e,r)=>{var n=r(9413),a=r(5089),o=r(6112),i=r(9268),s=r(1667),c=TypeError;t.exports=function(t,e){var r=arguments.length<2?s(t):e;if(a(r))return o(n(r,t));throw c(i(t)+" is not iterable")}},2964:(t,e,r)=>{var n=r(5089);t.exports=function(t,e){var r=t[e];return null==r?void 0:n(r)}},8509:(t,e,r)=>{var n=r(8240),a=r(3060),o=Math.floor,i=n("".charAt),s=n("".replace),c=n("".slice),u=/\$([$&'`]|\d{1,2}|<[^>]*>)/g,l=/\$([$&'`]|\d{1,2})/g;t.exports=function(t,e,r,n,p,h){var d=r+t.length,f=n.length,v=l;return void 0!==p&&(p=a(p),v=u),s(h,v,(function(a,s){var u;switch(i(s,0)){case"$":return"$";case"&":return t;case"`":return c(e,0,r);case"'":return c(e,d);case"<":u=p[c(s,1,-1)];break;default:var l=+s;if(0===l)return a;if(l>f){var h=o(l/10);return 0===h?a:h<=f?void 0===n[h-1]?i(s,1):n[h-1]+i(s,1):a}u=n[l-1]}return void 0===u?"":u}))}},2086:(t,e,r)=>{var n=function(t){return t&&t.Math==Math&&t};t.exports=n("object"==typeof globalThis&&globalThis)||n("object"==typeof window&&window)||n("object"==typeof self&&self)||n("object"==typeof r.g&&r.g)||function(){return this}()||Function("return this")()},9606:(t,e,r)=>{var n=r(8240),a=r(3060),o=n({}.hasOwnProperty);t.exports=Object.hasOwn||function(t,e){return o(a(t),e)}},7153:t=>{t.exports={}},5963:(t,e,r)=>{var n=r(563);t.exports=n("document","documentElement")},6761:(t,e,r)=>{var n=r(5283),a=r(3677),o=r(821);t.exports=!n&&!a((function(){return 7!=Object.defineProperty(o("div"),"a",{get:function(){return 7}}).a}))},5974:(t,e,r)=>{var n=r(8240),a=r(3677),o=r(2306),i=Object,s=n("".split);t.exports=a((function(){return!i("z").propertyIsEnumerable(0)}))?function(t){return"String"==o(t)?s(t,""):i(t)}:i},9277:(t,e,r)=>{var n=r(8240),a=r(930),o=r(4489),i=n(Function.toString);a(o.inspectSource)||(o.inspectSource=function(t){return i(t)}),t.exports=o.inspectSource},2423:(t,e,r)=>{var n=r(1695),a=r(8240),o=r(7153),i=r(8759),s=r(9606),c=r(7826).f,u=r(62),l=r(3226),p=r(3813),h=r(5422),d=r(6910),f=!1,v=h("meta"),m=0,b=function(t){c(t,v,{value:{objectID:"O"+m++,weakData:{}}})},g=t.exports={enable:function(){g.enable=function(){},f=!0;var t=u.f,e=a([].splice),r={};r[v]=1,t(r).length&&(u.f=function(r){for(var n=t(r),a=0,o=n.length;a<o;a++)if(n[a]===v){e(n,a,1);break}return n},n({target:"Object",stat:!0,forced:!0},{getOwnPropertyNames:l.f}))},fastKey:function(t,e){if(!i(t))return"symbol"==typeof t?t:("string"==typeof t?"S":"P")+t;if(!s(t,v)){if(!p(t))return"F";if(!e)return"E";b(t)}return t[v].objectID},getWeakData:function(t,e){if(!s(t,v)){if(!p(t))return!0;if(!e)return!1;b(t)}return t[v].weakData},onFreeze:function(t){return d&&f&&p(t)&&!s(t,v)&&b(t),t}};o[v]=!0},3278:(t,e,r)=>{var n,a,o,i=r(9316),s=r(2086),c=r(8240),u=r(8759),l=r(2585),p=r(9606),h=r(4489),d=r(8944),f=r(7153),v="Object already initialized",m=s.TypeError,b=s.WeakMap;if(i||h.state){var g=h.state||(h.state=new b),y=c(g.get),k=c(g.has),w=c(g.set);n=function(t,e){if(k(g,t))throw new m(v);return e.facade=t,w(g,t,e),e},a=function(t){return y(g,t)||{}},o=function(t){return k(g,t)}}else{var C=d("state");f[C]=!0,n=function(t,e){if(p(t,C))throw new m(v);return e.facade=t,l(t,C,e),e},a=function(t){return p(t,C)?t[C]:{}},o=function(t){return p(t,C)}}t.exports={set:n,get:a,has:o,enforce:function(t){return o(t)?a(t):n(t,{})},getterFor:function(t){return function(e){var r;if(!u(e)||(r=a(e)).type!==t)throw m("Incompatible receiver, "+t+" required");return r}}}},2814:(t,e,r)=>{var n=r(211),a=r(7719),o=n("iterator"),i=Array.prototype;t.exports=function(t){return void 0!==t&&(a.Array===t||i[o]===t)}},6526:(t,e,r)=>{var n=r(2306);t.exports=Array.isArray||function(t){return"Array"==n(t)}},930:t=>{t.exports=function(t){return"function"==typeof t}},1956:(t,e,r)=>{var n=r(8240),a=r(3677),o=r(930),i=r(375),s=r(563),c=r(9277),u=function(){},l=[],p=s("Reflect","construct"),h=/^\s*(?:class|function)\b/,d=n(h.exec),f=!h.exec(u),v=function(t){if(!o(t))return!1;try{return p(u,l,t),!0}catch(t){return!1}},m=function(t){if(!o(t))return!1;switch(i(t)){case"AsyncFunction":case"GeneratorFunction":case"AsyncGeneratorFunction":return!1}try{return f||!!d(h,c(t))}catch(t){return!0}};m.sham=!0,t.exports=!p||a((function(){var t;return v(v.call)||!v(Object)||!v((function(){t=!0}))||t}))?m:v},7189:(t,e,r)=>{var n=r(3677),a=r(930),o=/#|\.prototype\./,i=function(t,e){var r=c[s(t)];return r==l||r!=u&&(a(e)?n(e):!!e)},s=i.normalize=function(t){return String(t).replace(o,".").toLowerCase()},c=i.data={},u=i.NATIVE="N",l=i.POLYFILL="P";t.exports=i},8759:(t,e,r)=>{var n=r(930);t.exports=function(t){return"object"==typeof t?null!==t:n(t)}},3296:t=>{t.exports=!1},7994:(t,e,r)=>{var n=r(8759),a=r(2306),o=r(211)("match");t.exports=function(t){var e;return n(t)&&(void 0!==(e=t[o])?!!e:"RegExp"==a(t))}},2071:(t,e,r)=>{var n=r(563),a=r(930),o=r(5516),i=r(1876),s=Object;t.exports=i?function(t){return"symbol"==typeof t}:function(t){var e=n("Symbol");return a(e)&&o(e.prototype,s(t))}},6737:(t,e,r)=>{var n=r(9413),a=r(6112),o=r(2964);t.exports=function(t,e,r){var i,s;a(t);try{if(!(i=o(t,"return"))){if("throw"===e)throw r;return r}i=n(i,t)}catch(t){s=!0,i=t}if("throw"===e)throw r;if(s)throw i;return a(i),r}},3083:(t,e,r)=>{"use strict";var n,a,o,i=r(3677),s=r(930),c=r(4710),u=r(2130),l=r(1343),p=r(211),h=r(3296),d=p("iterator"),f=!1;[].keys&&("next"in(o=[].keys())?(a=u(u(o)))!==Object.prototype&&(n=a):f=!0),null==n||i((function(){var t={};return n[d].call(t)!==t}))?n={}:h&&(n=c(n)),s(n[d])||l(n,d,(function(){return this})),t.exports={IteratorPrototype:n,BUGGY_SAFARI_ITERATORS:f}},7719:t=>{t.exports={}},2871:(t,e,r)=>{var n=r(4005);t.exports=function(t){return n(t.length)}},3712:(t,e,r)=>{var n=r(3677),a=r(930),o=r(9606),i=r(5283),s=r(4398).CONFIGURABLE,c=r(9277),u=r(3278),l=u.enforce,p=u.get,h=Object.defineProperty,d=i&&!n((function(){return 8!==h((function(){}),"length",{value:8}).length})),f=String(String).split("String"),v=t.exports=function(t,e,r){"Symbol("===String(e).slice(0,7)&&(e="["+String(e).replace(/^Symbol\(([^)]*)\)/,"$1")+"]"),r&&r.getter&&(e="get "+e),r&&r.setter&&(e="set "+e),(!o(t,"name")||s&&t.name!==e)&&(i?h(t,"name",{value:e,configurable:!0}):t.name=e),d&&r&&o(r,"arity")&&t.length!==r.arity&&h(t,"length",{value:r.arity});try{r&&o(r,"constructor")&&r.constructor?i&&h(t,"prototype",{writable:!1}):t.prototype&&(t.prototype=void 0)}catch(t){}var n=l(t);return o(n,"source")||(n.source=f.join("string"==typeof e?e:"")),t};Function.prototype.toString=v((function(){return a(this)&&p(this).source||c(this)}),"toString")},5681:t=>{var e=Math.ceil,r=Math.floor;t.exports=Math.trunc||function(t){var n=+t;return(n>0?r:e)(n)}},3441:(t,e,r)=>{var n=r(3193);t.exports=n&&!!Symbol.for&&!!Symbol.keyFor},3193:(t,e,r)=>{var n=r(1448),a=r(3677);t.exports=!!Object.getOwnPropertySymbols&&!a((function(){var t=Symbol();return!String(t)||!(Object(t)instanceof Symbol)||!Symbol.sham&&n&&n<41}))},9316:(t,e,r)=>{var n=r(2086),a=r(930),o=r(9277),i=n.WeakMap;t.exports=a(i)&&/native code/.test(o(i))},8675:(t,e,r)=>{"use strict";var n=r(5283),a=r(8240),o=r(9413),i=r(3677),s=r(8779),c=r(6952),u=r(7446),l=r(3060),p=r(5974),h=Object.assign,d=Object.defineProperty,f=a([].concat);t.exports=!h||i((function(){if(n&&1!==h({b:1},h(d({},"a",{enumerable:!0,get:function(){d(this,"b",{value:3,enumerable:!1})}}),{b:2})).b)return!0;var t={},e={},r=Symbol(),a="abcdefghijklmnopqrst";return t[r]=7,a.split("").forEach((function(t){e[t]=t})),7!=h({},t)[r]||s(h({},e)).join("")!=a}))?function(t,e){for(var r=l(t),a=arguments.length,i=1,h=c.f,d=u.f;a>i;)for(var v,m=p(arguments[i++]),b=h?f(s(m),h(m)):s(m),g=b.length,y=0;g>y;)v=b[y++],n&&!o(d,m,v)||(r[v]=m[v]);return r}:h},4710:(t,e,r)=>{var n,a=r(6112),o=r(7711),i=r(8684),s=r(7153),c=r(5963),u=r(821),l=r(8944),p=l("IE_PROTO"),h=function(){},d=function(t){return"<script>"+t+"</"+"script>"},f=function(t){t.write(d("")),t.close();var e=t.parentWindow.Object;return t=null,e},v=function(){try{n=new ActiveXObject("htmlfile")}catch(t){}var t,e;v="undefined"!=typeof document?document.domain&&n?f(n):((e=u("iframe")).style.display="none",c.appendChild(e),e.src=String("javascript:"),(t=e.contentWindow.document).open(),t.write(d("document.F=Object")),t.close(),t.F):f(n);for(var r=i.length;r--;)delete v.prototype[i[r]];return v()};s[p]=!0,t.exports=Object.create||function(t,e){var r;return null!==t?(h.prototype=a(t),r=new h,h.prototype=null,r[p]=t):r=v(),void 0===e?r:o.f(r,e)}},7711:(t,e,r)=>{var n=r(5283),a=r(8202),o=r(7826),i=r(6112),s=r(4088),c=r(8779);e.f=n&&!a?Object.defineProperties:function(t,e){i(t);for(var r,n=s(e),a=c(e),u=a.length,l=0;u>l;)o.f(t,r=a[l++],n[r]);return t}},7826:(t,e,r)=>{var n=r(5283),a=r(6761),o=r(8202),i=r(6112),s=r(2258),c=TypeError,u=Object.defineProperty,l=Object.getOwnPropertyDescriptor,p="enumerable",h="configurable",d="writable";e.f=n?o?function(t,e,r){if(i(t),e=s(e),i(r),"function"==typeof t&&"prototype"===e&&"value"in r&&d in r&&!r.writable){var n=l(t,e);n&&n.writable&&(t[e]=r.value,r={configurable:h in r?r.configurable:n.configurable,enumerable:p in r?r.enumerable:n.enumerable,writable:!1})}return u(t,e,r)}:u:function(t,e,r){if(i(t),e=s(e),i(r),a)try{return u(t,e,r)}catch(t){}if("get"in r||"set"in r)throw c("Accessors not supported");return"value"in r&&(t[e]=r.value),t}},4399:(t,e,r)=>{var n=r(5283),a=r(9413),o=r(7446),i=r(5736),s=r(4088),c=r(2258),u=r(9606),l=r(6761),p=Object.getOwnPropertyDescriptor;e.f=n?p:function(t,e){if(t=s(t),e=c(e),l)try{return p(t,e)}catch(t){}if(u(t,e))return i(!a(o.f,t,e),t[e])}},3226:(t,e,r)=>{var n=r(2306),a=r(4088),o=r(62).f,i=r(3329),s="object"==typeof window&&window&&Object.getOwnPropertyNames?Object.getOwnPropertyNames(window):[];t.exports.f=function(t){return s&&"Window"==n(t)?function(t){try{return o(t)}catch(t){return i(s)}}(t):o(a(t))}},62:(t,e,r)=>{var n=r(1352),a=r(8684).concat("length","prototype");e.f=Object.getOwnPropertyNames||function(t){return n(t,a)}},6952:(t,e)=>{e.f=Object.getOwnPropertySymbols},2130:(t,e,r)=>{var n=r(9606),a=r(930),o=r(3060),i=r(8944),s=r(7209),c=i("IE_PROTO"),u=Object,l=u.prototype;t.exports=s?u.getPrototypeOf:function(t){var e=o(t);if(n(e,c))return e[c];var r=e.constructor;return a(r)&&e instanceof r?r.prototype:e instanceof u?l:null}},3813:(t,e,r)=>{var n=r(3677),a=r(8759),o=r(2306),i=r(1005),s=Object.isExtensible,c=n((function(){s(1)}));t.exports=c||i?function(t){return!!a(t)&&((!i||"ArrayBuffer"!=o(t))&&(!s||s(t)))}:s},5516:(t,e,r)=>{var n=r(8240);t.exports=n({}.isPrototypeOf)},1352:(t,e,r)=>{var n=r(8240),a=r(9606),o=r(4088),i=r(6198).indexOf,s=r(7153),c=n([].push);t.exports=function(t,e){var r,n=o(t),u=0,l=[];for(r in n)!a(s,r)&&a(n,r)&&c(l,r);for(;e.length>u;)a(n,r=e[u++])&&(~i(l,r)||c(l,r));return l}},8779:(t,e,r)=>{var n=r(1352),a=r(8684);t.exports=Object.keys||function(t){return n(t,a)}},7446:(t,e)=>{"use strict";var r={}.propertyIsEnumerable,n=Object.getOwnPropertyDescriptor,a=n&&!r.call({1:2},1);e.f=a?function(t){var e=n(this,t);return!!e&&e.enumerable}:r},7530:(t,e,r)=>{var n=r(8240),a=r(6112),o=r(1378);t.exports=Object.setPrototypeOf||("__proto__"in{}?function(){var t,e=!1,r={};try{(t=n(Object.getOwnPropertyDescriptor(Object.prototype,"__proto__").set))(r,[]),e=r instanceof Array}catch(t){}return function(r,n){return a(r),o(n),e?t(r,n):r.__proto__=n,r}}():void 0)},999:(t,e,r)=>{"use strict";var n=r(2371),a=r(375);t.exports=n?{}.toString:function(){return"[object "+a(this)+"]"}},7999:(t,e,r)=>{var n=r(9413),a=r(930),o=r(8759),i=TypeError;t.exports=function(t,e){var r,s;if("string"===e&&a(r=t.toString)&&!o(s=n(r,t)))return s;if(a(r=t.valueOf)&&!o(s=n(r,t)))return s;if("string"!==e&&a(r=t.toString)&&!o(s=n(r,t)))return s;throw i("Can't convert object to primitive value")}},6095:(t,e,r)=>{var n=r(563),a=r(8240),o=r(62),i=r(6952),s=r(6112),c=a([].concat);t.exports=n("Reflect","ownKeys")||function(t){var e=o.f(s(t)),r=i.f;return r?c(e,r(t)):e}},9775:(t,e,r)=>{var n=r(2086);t.exports=n},1189:(t,e,r)=>{var n=r(9413),a=r(6112),o=r(930),i=r(2306),s=r(4861),c=TypeError;t.exports=function(t,e){var r=t.exec;if(o(r)){var u=n(r,t,e);return null!==u&&a(u),u}if("RegExp"===i(t))return n(s,t,e);throw c("RegExp#exec called on incompatible receiver")}},4861:(t,e,r)=>{"use strict";var n,a,o=r(9413),i=r(8240),s=r(4059),c=r(4276),u=r(4930),l=r(9197),p=r(4710),h=r(3278).get,d=r(2582),f=r(2910),v=l("native-string-replace",String.prototype.replace),m=RegExp.prototype.exec,b=m,g=i("".charAt),y=i("".indexOf),k=i("".replace),w=i("".slice),C=(a=/b*/g,o(m,n=/a/,"a"),o(m,a,"a"),0!==n.lastIndex||0!==a.lastIndex),S=u.BROKEN_CARET,x=void 0!==/()??/.exec("")[1];(C||x||S||d||f)&&(b=function(t){var e,r,n,a,i,u,l,d=this,f=h(d),O=s(t),E=f.raw;if(E)return E.lastIndex=d.lastIndex,e=o(b,E,O),d.lastIndex=E.lastIndex,e;var L=f.groups,P=S&&d.sticky,A=o(c,d),T=d.source,j=0,I=O;if(P&&(A=k(A,"y",""),-1===y(A,"g")&&(A+="g"),I=w(O,d.lastIndex),d.lastIndex>0&&(!d.multiline||d.multiline&&"\n"!==g(O,d.lastIndex-1))&&(T="(?: "+T+")",I=" "+I,j++),r=new RegExp("^(?:"+T+")",A)),x&&(r=new RegExp("^"+T+"$(?!\\s)",A)),C&&(n=d.lastIndex),a=o(m,P?r:d,I),P?a?(a.input=w(a.input,j),a[0]=w(a[0],j),a.index=d.lastIndex,d.lastIndex+=a[0].length):d.lastIndex=0:C&&a&&(d.lastIndex=d.global?a.index+a[0].length:n),x&&a&&a.length>1&&o(v,a[0],r,(function(){for(i=1;i<arguments.length-2;i++)void 0===arguments[i]&&(a[i]=void 0)})),a&&L)for(a.groups=u=p(null),i=0;i<L.length;i++)u[(l=L[i])[0]]=a[l[1]];return a}),t.exports=b},4276:(t,e,r)=>{"use strict";var n=r(6112);t.exports=function(){var t=n(this),e="";return t.hasIndices&&(e+="d"),t.global&&(e+="g"),t.ignoreCase&&(e+="i"),t.multiline&&(e+="m"),t.dotAll&&(e+="s"),t.unicode&&(e+="u"),t.unicodeSets&&(e+="v"),t.sticky&&(e+="y"),e}},9028:(t,e,r)=>{var n=r(9413),a=r(9606),o=r(5516),i=r(4276),s=RegExp.prototype;t.exports=function(t){var e=t.flags;return void 0!==e||"flags"in s||a(t,"flags")||!o(s,t)?e:n(i,t)}},4930:(t,e,r)=>{var n=r(3677),a=r(2086).RegExp,o=n((function(){var t=a("a","y");return t.lastIndex=2,null!=t.exec("abcd")})),i=o||n((function(){return!a("a","y").sticky})),s=o||n((function(){var t=a("^r","gy");return t.lastIndex=2,null!=t.exec("str")}));t.exports={BROKEN_CARET:s,MISSED_STICKY:i,UNSUPPORTED_Y:o}},2582:(t,e,r)=>{var n=r(3677),a=r(2086).RegExp;t.exports=n((function(){var t=a(".","s");return!(t.dotAll&&t.exec("\n")&&"s"===t.flags)}))},2910:(t,e,r)=>{var n=r(3677),a=r(2086).RegExp;t.exports=n((function(){var t=a("(?<a>b)","g");return"b"!==t.exec("b").groups.a||"bc"!=="b".replace(t,"$<a>c")}))},9586:t=>{var e=TypeError;t.exports=function(t){if(null==t)throw e("Can't call method on "+t);return t}},914:(t,e,r)=>{var n=r(7826).f,a=r(9606),o=r(211)("toStringTag");t.exports=function(t,e,r){t&&!r&&(t=t.prototype),t&&!a(t,o)&&n(t,o,{configurable:!0,value:e})}},8944:(t,e,r)=>{var n=r(9197),a=r(5422),o=n("keys");t.exports=function(t){return o[t]||(o[t]=a(t))}},4489:(t,e,r)=>{var n=r(2086),a=r(9444),o="__core-js_shared__",i=n[o]||a(o,{});t.exports=i},9197:(t,e,r)=>{var n=r(3296),a=r(4489);(t.exports=function(t,e){return a[t]||(a[t]=void 0!==e?e:{})})("versions",[]).push({version:"3.23.3",mode:n?"pure":"global",copyright:"© 2014-2022 Denis Pushkarev (zloirock.ru)",license:"https://github.com/zloirock/core-js/blob/v3.23.3/LICENSE",source:"https://github.com/zloirock/core-js"})},8515:(t,e,r)=>{var n=r(6112),a=r(1449),o=r(211)("species");t.exports=function(t,e){var r,i=n(t).constructor;return void 0===i||null==(r=n(i)[o])?e:a(r)}},3448:(t,e,r)=>{var n=r(8240),a=r(9502),o=r(4059),i=r(9586),s=n("".charAt),c=n("".charCodeAt),u=n("".slice),l=function(t){return function(e,r){var n,l,p=o(i(e)),h=a(r),d=p.length;return h<0||h>=d?t?"":void 0:(n=c(p,h))<55296||n>56319||h+1===d||(l=c(p,h+1))<56320||l>57343?t?s(p,h):n:t?u(p,h,h+2):l-56320+(n-55296<<10)+65536}};t.exports={codeAt:l(!1),charAt:l(!0)}},338:(t,e,r)=>{var n=r(9413),a=r(563),o=r(211),i=r(1343);t.exports=function(){var t=a("Symbol"),e=t&&t.prototype,r=e&&e.valueOf,s=o("toPrimitive");e&&!e[s]&&i(e,s,(function(t){return n(r,this)}),{arity:1})}},7740:(t,e,r)=>{var n=r(9502),a=Math.max,o=Math.min;t.exports=function(t,e){var r=n(t);return r<0?a(r+e,0):o(r,e)}},4088:(t,e,r)=>{var n=r(5974),a=r(9586);t.exports=function(t){return n(a(t))}},9502:(t,e,r)=>{var n=r(5681);t.exports=function(t){var e=+t;return e!=e||0===e?0:n(e)}},4005:(t,e,r)=>{var n=r(9502),a=Math.min;t.exports=function(t){return t>0?a(n(t),9007199254740991):0}},3060:(t,e,r)=>{var n=r(9586),a=Object;t.exports=function(t){return a(n(t))}},1288:(t,e,r)=>{var n=r(9413),a=r(8759),o=r(2071),i=r(2964),s=r(7999),c=r(211),u=TypeError,l=c("toPrimitive");t.exports=function(t,e){if(!a(t)||o(t))return t;var r,c=i(t,l);if(c){if(void 0===e&&(e="default"),r=n(c,t,e),!a(r)||o(r))return r;throw u("Can't convert object to primitive value")}return void 0===e&&(e="number"),s(t,e)}},2258:(t,e,r)=>{var n=r(1288),a=r(2071);t.exports=function(t){var e=n(t,"string");return a(e)?e:e+""}},2371:(t,e,r)=>{var n={};n[r(211)("toStringTag")]="z",t.exports="[object z]"===String(n)},4059:(t,e,r)=>{var n=r(375),a=String;t.exports=function(t){if("Symbol"===n(t))throw TypeError("Cannot convert a Symbol value to a string");return a(t)}},9268:t=>{var e=String;t.exports=function(t){try{return e(t)}catch(t){return"Object"}}},5422:(t,e,r)=>{var n=r(8240),a=0,o=Math.random(),i=n(1..toString);t.exports=function(t){return"Symbol("+(void 0===t?"":t)+")_"+i(++a+o,36)}},1876:(t,e,r)=>{var n=r(3193);t.exports=n&&!Symbol.sham&&"symbol"==typeof Symbol.iterator},8202:(t,e,r)=>{var n=r(5283),a=r(3677);t.exports=n&&a((function(){return 42!=Object.defineProperty((function(){}),"prototype",{value:42,writable:!1}).prototype}))},9251:(t,e,r)=>{var n=r(211);e.f=n},211:(t,e,r)=>{var n=r(2086),a=r(9197),o=r(9606),i=r(5422),s=r(3193),c=r(1876),u=a("wks"),l=n.Symbol,p=l&&l.for,h=c?l:l&&l.withoutSetter||i;t.exports=function(t){if(!o(u,t)||!s&&"string"!=typeof u[t]){var e="Symbol."+t;s&&o(l,t)?u[t]=l[t]:u[t]=c&&p?p(e):h(e)}return u[t]}},3938:(t,e,r)=>{"use strict";var n=r(1695),a=r(3677),o=r(6526),i=r(8759),s=r(3060),c=r(2871),u=r(7620),l=r(9720),p=r(5574),h=r(9955),d=r(211),f=r(1448),v=d("isConcatSpreadable"),m=f>=51||!a((function(){var t=[];return t[v]=!1,t.concat()[0]!==t})),b=h("concat"),g=function(t){if(!i(t))return!1;var e=t[v];return void 0!==e?!!e:o(t)};n({target:"Array",proto:!0,arity:1,forced:!m||!b},{concat:function(t){var e,r,n,a,o,i=s(this),h=p(i,0),d=0;for(e=-1,n=arguments.length;e<n;e++)if(g(o=-1===e?i:arguments[e]))for(a=c(o),u(d+a),r=0;r<a;r++,d++)r in o&&l(h,d,o[r]);else u(d+1),l(h,d++,o);return h.length=d,h}})},8010:(t,e,r)=>{"use strict";var n=r(1695),a=r(8062).filter;n({target:"Array",proto:!0,forced:!r(9955)("filter")},{filter:function(t){return a(this,t,arguments.length>1?arguments[1]:void 0)}})},5610:(t,e,r)=>{var n=r(1695),a=r(1842);n({target:"Array",stat:!0,forced:!r(8939)((function(t){Array.from(t)}))},{from:a})},5769:(t,e,r)=>{"use strict";var n=r(4088),a=r(8669),o=r(7719),i=r(3278),s=r(7826).f,c=r(8432),u=r(3296),l=r(5283),p="Array Iterator",h=i.set,d=i.getterFor(p);t.exports=c(Array,"Array",(function(t,e){h(this,{type:p,target:n(t),index:0,kind:e})}),(function(){var t=d(this),e=t.target,r=t.kind,n=t.index++;return!e||n>=e.length?(t.target=void 0,{value:void 0,done:!0}):"keys"==r?{value:n,done:!1}:"values"==r?{value:e[n],done:!1}:{value:[n,e[n]],done:!1}}),"values");var f=o.Arguments=o.Array;if(a("keys"),a("values"),a("entries"),!u&&l&&"values"!==f.name)try{s(f,"name",{value:"values"})}catch(t){}},5613:(t,e,r)=>{"use strict";var n=r(1695),a=r(8240),o=r(5974),i=r(4088),s=r(2802),c=a([].join),u=o!=Object,l=s("join",",");n({target:"Array",proto:!0,forced:u||!l},{join:function(t){return c(i(this),void 0===t?",":t)}})},1013:(t,e,r)=>{"use strict";var n=r(1695),a=r(8062).map;n({target:"Array",proto:!0,forced:!r(9955)("map")},{map:function(t){return a(this,t,arguments.length>1?arguments[1]:void 0)}})},2410:(t,e,r)=>{"use strict";var n=r(1695),a=r(6526),o=r(1956),i=r(8759),s=r(7740),c=r(2871),u=r(4088),l=r(9720),p=r(211),h=r(9955),d=r(745),f=h("slice"),v=p("species"),m=Array,b=Math.max;n({target:"Array",proto:!0,forced:!f},{slice:function(t,e){var r,n,p,h=u(this),f=c(h),g=s(t,f),y=s(void 0===e?f:e,f);if(a(h)&&(r=h.constructor,(o(r)&&(r===m||a(r.prototype))||i(r)&&null===(r=r[v]))&&(r=void 0),r===m||void 0===r))return d(h,g,y);for(n=new(void 0===r?m:r)(b(y-g,0)),p=0;g<y;g++,p++)g in h&&l(n,p,h[g]);return n.length=p,n}})},3352:(t,e,r)=>{var n=r(5283),a=r(4398).EXISTS,o=r(8240),i=r(7826).f,s=Function.prototype,c=o(s.toString),u=/function\b(?:\s|\/\*[\S\s]*?\*\/|\/\/[^\n\r]*[\n\r]+)*([^\s(/]*)/,l=o(u.exec);n&&!a&&i(s,"name",{configurable:!0,get:function(){try{return l(u,c(this))[1]}catch(t){return""}}})},5735:(t,e,r)=>{var n=r(1695),a=r(563),o=r(7258),i=r(9413),s=r(8240),c=r(3677),u=r(6526),l=r(930),p=r(8759),h=r(2071),d=r(745),f=r(3193),v=a("JSON","stringify"),m=s(/./.exec),b=s("".charAt),g=s("".charCodeAt),y=s("".replace),k=s(1..toString),w=/[\uD800-\uDFFF]/g,C=/^[\uD800-\uDBFF]$/,S=/^[\uDC00-\uDFFF]$/,x=!f||c((function(){var t=a("Symbol")();return"[null]"!=v([t])||"{}"!=v({a:t})||"{}"!=v(Object(t))})),O=c((function(){return'"\\udf06\\ud834"'!==v("\udf06\ud834")||'"\\udead"'!==v("\udead")})),E=function(t,e){var r=d(arguments),n=e;if((p(e)||void 0!==t)&&!h(t))return u(e)||(e=function(t,e){if(l(n)&&(e=i(n,this,t,e)),!h(e))return e}),r[1]=e,o(v,null,r)},L=function(t,e,r){var n=b(r,e-1),a=b(r,e+1);return m(C,t)&&!m(S,a)||m(S,t)&&!m(C,n)?"\\u"+k(g(t,0),16):t};v&&n({target:"JSON",stat:!0,arity:3,forced:x||O},{stringify:function(t,e,r){var n=d(arguments),a=o(x?E:v,null,n);return O&&"string"==typeof a?y(a,w,L):a}})},8410:(t,e,r)=>{var n=r(1695),a=r(8675);n({target:"Object",stat:!0,arity:2,forced:Object.assign!==a},{assign:a})},4844:(t,e,r)=>{var n=r(1695),a=r(6910),o=r(3677),i=r(8759),s=r(2423).onFreeze,c=Object.freeze;n({target:"Object",stat:!0,forced:o((function(){c(1)})),sham:!a},{freeze:function(t){return c&&i(t)?c(s(t)):t}})},252:(t,e,r)=>{var n=r(1695),a=r(3677),o=r(4088),i=r(4399).f,s=r(5283),c=a((function(){i(1)}));n({target:"Object",stat:!0,forced:!s||c,sham:!s},{getOwnPropertyDescriptor:function(t,e){return i(o(t),e)}})},4009:(t,e,r)=>{var n=r(1695),a=r(5283),o=r(6095),i=r(4088),s=r(4399),c=r(9720);n({target:"Object",stat:!0,sham:!a},{getOwnPropertyDescriptors:function(t){for(var e,r,n=i(t),a=s.f,u=o(n),l={},p=0;u.length>p;)void 0!==(r=a(n,e=u[p++]))&&c(l,e,r);return l}})},883:(t,e,r)=>{var n=r(1695),a=r(3193),o=r(3677),i=r(6952),s=r(3060);n({target:"Object",stat:!0,forced:!a||o((function(){i.f(1)}))},{getOwnPropertySymbols:function(t){var e=i.f;return e?e(s(t)):[]}})},2274:(t,e,r)=>{var n=r(1695),a=r(3677),o=r(3060),i=r(2130),s=r(7209);n({target:"Object",stat:!0,forced:a((function(){i(1)})),sham:!s},{getPrototypeOf:function(t){return i(o(t))}})},2571:(t,e,r)=>{var n=r(1695),a=r(3060),o=r(8779);n({target:"Object",stat:!0,forced:r(3677)((function(){o(1)}))},{keys:function(t){return o(a(t))}})},3238:(t,e,r)=>{var n=r(2371),a=r(1343),o=r(999);n||a(Object.prototype,"toString",o,{unsafe:!0})},3214:(t,e,r)=>{var n=r(1695),a=r(563),o=r(7258),i=r(2395),s=r(1449),c=r(6112),u=r(8759),l=r(4710),p=r(3677),h=a("Reflect","construct"),d=Object.prototype,f=[].push,v=p((function(){function t(){}return!(h((function(){}),[],t)instanceof t)})),m=!p((function(){h((function(){}))})),b=v||m;n({target:"Reflect",stat:!0,forced:b,sham:b},{construct:function(t,e){s(t),c(e);var r=arguments.length<3?t:s(arguments[2]);if(m&&!v)return h(t,e,r);if(t==r){switch(e.length){case 0:return new t;case 1:return new t(e[0]);case 2:return new t(e[0],e[1]);case 3:return new t(e[0],e[1],e[2]);case 4:return new t(e[0],e[1],e[2],e[3])}var n=[null];return o(f,n,e),new(o(i,t,n))}var a=r.prototype,p=l(u(a)?a:d),b=o(t,p,e);return u(b)?b:p}})},2077:(t,e,r)=>{"use strict";var n=r(1695),a=r(4861);n({target:"RegExp",proto:!0,forced:/./.exec!==a},{exec:a})},895:(t,e,r)=>{"use strict";var n=r(4398).PROPER,a=r(1343),o=r(6112),i=r(4059),s=r(3677),c=r(9028),u="toString",l=RegExp.prototype.toString,p=s((function(){return"/a/b"!=l.call({source:"a",flags:"b"})})),h=n&&l.name!=u;(p||h)&&a(RegExp.prototype,u,(function(){var t=o(this);return"/"+i(t.source)+"/"+i(c(t))}),{unsafe:!0})},7460:(t,e,r)=>{"use strict";var n=r(3448).charAt,a=r(4059),o=r(3278),i=r(8432),s="String Iterator",c=o.set,u=o.getterFor(s);i(String,"String",(function(t){c(this,{type:s,string:a(t),index:0})}),(function(){var t,e=u(this),r=e.string,a=e.index;return a>=r.length?{value:void 0,done:!0}:(t=n(r,a),e.index+=t.length,{value:t,done:!1})}))},911:(t,e,r)=>{"use strict";var n=r(7258),a=r(9413),o=r(8240),i=r(2331),s=r(3677),c=r(6112),u=r(930),l=r(9502),p=r(4005),h=r(4059),d=r(9586),f=r(9966),v=r(2964),m=r(8509),b=r(1189),g=r(211)("replace"),y=Math.max,k=Math.min,w=o([].concat),C=o([].push),S=o("".indexOf),x=o("".slice),O="$0"==="a".replace(/./,"$0"),E=!!/./[g]&&""===/./[g]("a","$0");i("replace",(function(t,e,r){var o=E?"$":"$0";return[function(t,r){var n=d(this),o=null==t?void 0:v(t,g);return o?a(o,t,n,r):a(e,h(n),t,r)},function(t,a){var i=c(this),s=h(t);if("string"==typeof a&&-1===S(a,o)&&-1===S(a,"$<")){var d=r(e,i,s,a);if(d.done)return d.value}var v=u(a);v||(a=h(a));var g=i.global;if(g){var O=i.unicode;i.lastIndex=0}for(var E=[];;){var L=b(i,s);if(null===L)break;if(C(E,L),!g)break;""===h(L[0])&&(i.lastIndex=f(s,p(i.lastIndex),O))}for(var P,A="",T=0,j=0;j<E.length;j++){for(var I=h((L=E[j])[0]),M=y(k(l(L.index),s.length),0),B=[],F=1;F<L.length;F++)C(B,void 0===(P=L[F])?P:String(P));var R=L.groups;if(v){var N=w([I],B,M,s);void 0!==R&&C(N,R);var D=h(n(a,void 0,N))}else D=m(I,s,M,B,R,a);M>=T&&(A+=x(s,T,M)+D,T=M+I.length)}return A+x(s,T)}]}),!!s((function(){var t=/./;return t.exec=function(){var t=[];return t.groups={a:"7"},t},"7"!=="".replace(t,"$<a>")}))||!O||E)},2482:(t,e,r)=>{"use strict";var n=r(7258),a=r(9413),o=r(8240),i=r(2331),s=r(7994),c=r(6112),u=r(9586),l=r(8515),p=r(9966),h=r(4005),d=r(4059),f=r(2964),v=r(3329),m=r(1189),b=r(4861),g=r(4930),y=r(3677),k=g.UNSUPPORTED_Y,w=4294967295,C=Math.min,S=[].push,x=o(/./.exec),O=o(S),E=o("".slice);i("split",(function(t,e,r){var o;return o="c"=="abbc".split(/(b)*/)[1]||4!="test".split(/(?:)/,-1).length||2!="ab".split(/(?:ab)*/).length||4!=".".split(/(.?)(.?)/).length||".".split(/()()/).length>1||"".split(/.?/).length?function(t,r){var o=d(u(this)),i=void 0===r?w:r>>>0;if(0===i)return[];if(void 0===t)return[o];if(!s(t))return a(e,o,t,i);for(var c,l,p,h=[],f=(t.ignoreCase?"i":"")+(t.multiline?"m":"")+(t.unicode?"u":"")+(t.sticky?"y":""),m=0,g=new RegExp(t.source,f+"g");(c=a(b,g,o))&&!((l=g.lastIndex)>m&&(O(h,E(o,m,c.index)),c.length>1&&c.index<o.length&&n(S,h,v(c,1)),p=c[0].length,m=l,h.length>=i));)g.lastIndex===c.index&&g.lastIndex++;return m===o.length?!p&&x(g,"")||O(h,""):O(h,E(o,m)),h.length>i?v(h,0,i):h}:"0".split(void 0,0).length?function(t,r){return void 0===t&&0===r?[]:a(e,this,t,r)}:e,[function(e,r){var n=u(this),i=null==e?void 0:f(e,t);return i?a(i,e,n,r):a(o,d(n),e,r)},function(t,n){var a=c(this),i=d(t),s=r(o,a,i,n,o!==e);if(s.done)return s.value;var u=l(a,RegExp),f=a.unicode,v=(a.ignoreCase?"i":"")+(a.multiline?"m":"")+(a.unicode?"u":"")+(k?"g":"y"),b=new u(k?"^(?:"+a.source+")":a,v),g=void 0===n?w:n>>>0;if(0===g)return[];if(0===i.length)return null===m(b,i)?[i]:[];for(var y=0,S=0,x=[];S<i.length;){b.lastIndex=k?0:S;var L,P=m(b,k?E(i,S):i);if(null===P||(L=C(h(b.lastIndex+(k?S:0)),i.length))===y)S=p(i,S,f);else{if(O(x,E(i,y,S)),x.length===g)return x;for(var A=1;A<=P.length-1;A++)if(O(x,P[A]),x.length===g)return x;S=y=L}}return O(x,E(i,y)),x}]}),!!y((function(){var t=/(?:)/,e=t.exec;t.exec=function(){return e.apply(this,arguments)};var r="ab".split(t);return 2!==r.length||"a"!==r[0]||"b"!==r[1]})),k)},4211:(t,e,r)=>{"use strict";var n=r(1695),a=r(2086),o=r(9413),i=r(8240),s=r(3296),c=r(5283),u=r(3193),l=r(3677),p=r(9606),h=r(5516),d=r(6112),f=r(4088),v=r(2258),m=r(4059),b=r(5736),g=r(4710),y=r(8779),k=r(62),w=r(3226),C=r(6952),S=r(4399),x=r(7826),O=r(7711),E=r(7446),L=r(1343),P=r(9197),A=r(8944),T=r(7153),j=r(5422),I=r(211),M=r(9251),B=r(4145),F=r(338),R=r(914),N=r(3278),D=r(8062).forEach,H=A("hidden"),_="Symbol",z=N.set,q=N.getterFor(_),U=Object.prototype,W=a.Symbol,V=W&&W.prototype,$=a.TypeError,G=a.QObject,X=S.f,J=x.f,Y=w.f,K=E.f,Q=i([].push),Z=P("symbols"),tt=P("op-symbols"),et=P("wks"),rt=!G||!G.prototype||!G.prototype.findChild,nt=c&&l((function(){return 7!=g(J({},"a",{get:function(){return J(this,"a",{value:7}).a}})).a}))?function(t,e,r){var n=X(U,e);n&&delete U[e],J(t,e,r),n&&t!==U&&J(U,e,n)}:J,at=function(t,e){var r=Z[t]=g(V);return z(r,{type:_,tag:t,description:e}),c||(r.description=e),r},ot=function(t,e,r){t===U&&ot(tt,e,r),d(t);var n=v(e);return d(r),p(Z,n)?(r.enumerable?(p(t,H)&&t[H][n]&&(t[H][n]=!1),r=g(r,{enumerable:b(0,!1)})):(p(t,H)||J(t,H,b(1,{})),t[H][n]=!0),nt(t,n,r)):J(t,n,r)},it=function(t,e){d(t);var r=f(e),n=y(r).concat(lt(r));return D(n,(function(e){c&&!o(st,r,e)||ot(t,e,r[e])})),t},st=function(t){var e=v(t),r=o(K,this,e);return!(this===U&&p(Z,e)&&!p(tt,e))&&(!(r||!p(this,e)||!p(Z,e)||p(this,H)&&this[H][e])||r)},ct=function(t,e){var r=f(t),n=v(e);if(r!==U||!p(Z,n)||p(tt,n)){var a=X(r,n);return!a||!p(Z,n)||p(r,H)&&r[H][n]||(a.enumerable=!0),a}},ut=function(t){var e=Y(f(t)),r=[];return D(e,(function(t){p(Z,t)||p(T,t)||Q(r,t)})),r},lt=function(t){var e=t===U,r=Y(e?tt:f(t)),n=[];return D(r,(function(t){!p(Z,t)||e&&!p(U,t)||Q(n,Z[t])})),n};u||(L(V=(W=function(){if(h(V,this))throw $("Symbol is not a constructor");var t=arguments.length&&void 0!==arguments[0]?m(arguments[0]):void 0,e=j(t),r=function(t){this===U&&o(r,tt,t),p(this,H)&&p(this[H],e)&&(this[H][e]=!1),nt(this,e,b(1,t))};return c&&rt&&nt(U,e,{configurable:!0,set:r}),at(e,t)}).prototype,"toString",(function(){return q(this).tag})),L(W,"withoutSetter",(function(t){return at(j(t),t)})),E.f=st,x.f=ot,O.f=it,S.f=ct,k.f=w.f=ut,C.f=lt,M.f=function(t){return at(I(t),t)},c&&(J(V,"description",{configurable:!0,get:function(){return q(this).description}}),s||L(U,"propertyIsEnumerable",st,{unsafe:!0}))),n({global:!0,constructor:!0,wrap:!0,forced:!u,sham:!u},{Symbol:W}),D(y(et),(function(t){B(t)})),n({target:_,stat:!0,forced:!u},{useSetter:function(){rt=!0},useSimple:function(){rt=!1}}),n({target:"Object",stat:!0,forced:!u,sham:!c},{create:function(t,e){return void 0===e?g(t):it(g(t),e)},defineProperty:ot,defineProperties:it,getOwnPropertyDescriptor:ct}),n({target:"Object",stat:!0,forced:!u},{getOwnPropertyNames:ut}),F(),R(W,_),T[H]=!0},2189:(t,e,r)=>{"use strict";var n=r(1695),a=r(5283),o=r(2086),i=r(8240),s=r(9606),c=r(930),u=r(5516),l=r(4059),p=r(7826).f,h=r(8474),d=o.Symbol,f=d&&d.prototype;if(a&&c(d)&&(!("description"in f)||void 0!==d().description)){var v={},m=function(){var t=arguments.length<1||void 0===arguments[0]?void 0:l(arguments[0]),e=u(f,this)?new d(t):void 0===t?d():d(t);return""===t&&(v[e]=!0),e};h(m,d),m.prototype=f,f.constructor=m;var b="Symbol(test)"==String(d("test")),g=i(f.toString),y=i(f.valueOf),k=/^Symbol\((.*)\)[^)]+$/,w=i("".replace),C=i("".slice);p(f,"description",{configurable:!0,get:function(){var t=y(this),e=g(t);if(s(v,t))return"";var r=b?C(e,7,-1):w(e,k,"$1");return""===r?void 0:r}}),n({global:!0,constructor:!0,forced:!0},{Symbol:m})}},8028:(t,e,r)=>{var n=r(1695),a=r(563),o=r(9606),i=r(4059),s=r(9197),c=r(3441),u=s("string-to-symbol-registry"),l=s("symbol-to-string-registry");n({target:"Symbol",stat:!0,forced:!c},{for:function(t){var e=i(t);if(o(u,e))return u[e];var r=a("Symbol")(e);return u[e]=r,l[r]=e,r}})},1047:(t,e,r)=>{r(4145)("iterator")},5901:(t,e,r)=>{r(4211),r(8028),r(9819),r(5735),r(883)},9819:(t,e,r)=>{var n=r(1695),a=r(9606),o=r(2071),i=r(9268),s=r(9197),c=r(3441),u=s("symbol-to-string-registry");n({target:"Symbol",stat:!0,forced:!c},{keyFor:function(t){if(!o(t))throw TypeError(i(t)+" is not a symbol");if(a(u,t))return u[t]}})},5849:(t,e,r)=>{var n=r(2086),a=r(933),o=r(3526),i=r(1984),s=r(2585),c=function(t){if(t&&t.forEach!==i)try{s(t,"forEach",i)}catch(e){t.forEach=i}};for(var u in a)a[u]&&c(n[u]&&n[u].prototype);c(o)},4078:(t,e,r)=>{var n=r(2086),a=r(933),o=r(3526),i=r(5769),s=r(2585),c=r(211),u=c("iterator"),l=c("toStringTag"),p=i.values,h=function(t,e){if(t){if(t[u]!==p)try{s(t,u,p)}catch(e){t[u]=p}if(t[l]||s(t,l,e),a[e])for(var r in i)if(t[r]!==i[r])try{s(t,r,i[r])}catch(e){t[r]=i[r]}}};for(var d in a)h(n[d]&&n[d].prototype,d);h(o,"DOMTokenList")},2062:()=>{var t,e;t=function(t){return t=+t,isNaN(t)||t==1/0||t==-1/0?0:t},e=function(t){t=t||document.getElementsByTagName("BODY")[0];var e=window.getComputedStyle(t),r=window.getComputedStyle(t.parent),n=e.overflowX,a=e.overflowY,o=r.overflowX,i=r.overflowY;return("table-column"==e.display||"table-column-group"==e.display)&&"visible"!=o&&"clip"!=o&&"visible"!=i&&"clip"!=i&&"visible"!=n&&"clip"!=n&&"visible"!=a&&"clip"!=a},Element.prototype.scroll||(Element.prototype.scroll=function(){var r,n,a=arguments.length,o=this.ownerDocument,i=o.defaultView,s="BackCompat"==o.compatMode,c=document.getElementsByTagName("BODY")[0],u={};if(o==window.document&&i&&0!==a){if(1===a){var l=arguments[0];if("object"!=typeof l)throw"Failed to execute 'scrollBy' on 'Element': parameter 1 ('options') is not an object.";"left"in l&&(u.left=t(l.left)),"top"in l&&(u.top=t(l.top)),r="left"in u?u.left:this.scrollLeft,n="top"in u?u.top:this.scrollTop}else u.left=r=t(arguments[0]),u.top=n=t(arguments[1]);if(this!=document.documentElement)this!=c||!s||e(c)?(this.scrollLeft=r,this.scrollTop=n):i.scroll(u.left,u.top);else{if(s)return;i.scroll("scrollX"in i?i.scrollX:"pageXOffset"in i?i.pageXOffset:this.scrollLeft,n)}}}),Element.prototype.scrollTo||(Element.prototype.scrollTo=Element.prototype.scroll),Element.prototype.scrollBy||(Element.prototype.scrollBy=function(){var e=arguments.length,r={};if(0!==e){if(1===e){var n=arguments[0];if("object"!=typeof n)throw"Failed to execute 'scrollBy' on 'Element': parameter 1 ('options') is not an object.";"left"in n&&(r.left=t(n.left)),"top"in n&&(r.top=t(n.top))}else r.left=t(arguments[0]),r.top=t(arguments[1]);r.left="left"in r?r.left+this.scrollLeft:this.scrollLeft,r.top="top"in r?r.top+this.scrollTop:this.scrollTop,this.scroll(r)}})},7190:t=>{t.exports=function(t){return!(!t||"string"==typeof t)&&(t instanceof Array||Array.isArray(t)||t.length>=0&&(t.splice instanceof Function||Object.getOwnPropertyDescriptor(t,t.length-1)&&"String"!==t.constructor.name))}},7159:(t,e,r)=>{var n,a,o;a=[r(5998)],n=function(t){function e(t){this.init(t)}e.prototype={value:0,size:100,startAngle:-Math.PI,thickness:"auto",fill:{gradient:["#3aeabb","#fdd250"]},emptyFill:"rgba(0, 0, 0, .1)",animation:{duration:1200,easing:"circleProgressEasing"},animationStartValue:0,reverse:!1,lineCap:"butt",insertMode:"prepend",constructor:e,el:null,canvas:null,ctx:null,radius:0,arcFill:null,lastFrameValue:0,init:function(e){t.extend(this,e),this.radius=this.size/2,this.initWidget(),this.initFill(),this.draw(),this.el.trigger("circle-inited")},initWidget:function(){this.canvas||(this.canvas=t("<canvas>")["prepend"==this.insertMode?"prependTo":"appendTo"](this.el)[0]);var e=this.canvas;if(e.width=this.size,e.height=this.size,this.ctx=e.getContext("2d"),window.devicePixelRatio>1){var r=window.devicePixelRatio;e.style.width=e.style.height=this.size+"px",e.width=e.height=this.size*r,this.ctx.scale(r,r)}},initFill:function(){var e,r=this,n=this.fill,a=this.ctx,o=this.size;if(!n)throw Error("The fill is not specified!");if("string"==typeof n&&(n={color:n}),n.color&&(this.arcFill=n.color),n.gradient){var i=n.gradient;if(1==i.length)this.arcFill=i[0];else if(i.length>1){for(var s=n.gradientAngle||0,c=n.gradientDirection||[o/2*(1-Math.cos(s)),o/2*(1+Math.sin(s)),o/2*(1+Math.cos(s)),o/2*(1-Math.sin(s))],u=a.createLinearGradient.apply(a,c),l=0;l<i.length;l++){var p=i[l],h=l/(i.length-1);t.isArray(p)&&(h=p[1],p=p[0]),u.addColorStop(h,p)}this.arcFill=u}}function d(){var n=t("<canvas>")[0];n.width=r.size,n.height=r.size,n.getContext("2d").drawImage(e,0,0,o,o),r.arcFill=r.ctx.createPattern(n,"no-repeat"),r.drawFrame(r.lastFrameValue)}n.image&&(n.image instanceof Image?e=n.image:(e=new Image).src=n.image,e.complete?d():e.onload=d)},draw:function(){this.animation?this.drawAnimated(this.value):this.drawFrame(this.value)},drawFrame:function(t){this.lastFrameValue=t,this.ctx.clearRect(0,0,this.size,this.size),this.drawEmptyArc(t),this.drawArc(t)},drawArc:function(t){if(0!==t){var e=this.ctx,r=this.radius,n=this.getThickness(),a=this.startAngle;e.save(),e.beginPath(),this.reverse?e.arc(r,r,r-n/2,a-2*Math.PI*t,a):e.arc(r,r,r-n/2,a,a+2*Math.PI*t),e.lineWidth=n,e.lineCap=this.lineCap,e.strokeStyle=this.arcFill,e.stroke(),e.restore()}},drawEmptyArc:function(t){var e=this.ctx,r=this.radius,n=this.getThickness(),a=this.startAngle;t<1&&(e.save(),e.beginPath(),t<=0?e.arc(r,r,r-n/2,0,2*Math.PI):this.reverse?e.arc(r,r,r-n/2,a,a-2*Math.PI*t):e.arc(r,r,r-n/2,a+2*Math.PI*t,a),e.lineWidth=n,e.strokeStyle=this.emptyFill,e.stroke(),e.restore())},drawAnimated:function(e){var r=this,n=this.el,a=t(this.canvas);a.stop(!0,!1),n.trigger("circle-animation-start"),a.css({animationProgress:0}).animate({animationProgress:1},t.extend({},this.animation,{step:function(t){var a=r.animationStartValue*(1-t)+e*t;r.drawFrame(a),n.trigger("circle-animation-progress",[t,a])}})).promise().always((function(){n.trigger("circle-animation-end")}))},getThickness:function(){return t.isNumeric(this.thickness)?this.thickness:this.size/14},getValue:function(){return this.value},setValue:function(t){this.animation&&(this.animationStartValue=this.lastFrameValue),this.value=t,this.draw()}},t.circleProgress={defaults:e.prototype},t.easing.circleProgressEasing=function(t){return t<.5?.5*(t*=2)*t*t:1-.5*(t=2-2*t)*t*t},t.fn.circleProgress=function(r,n){var a="circle-progress",o=this.data(a);if("widget"==r){if(!o)throw Error('Calling "widget" method on not initialized instance is forbidden');return o.canvas}if("value"==r){if(!o)throw Error('Calling "value" method on not initialized instance is forbidden');if(void 0===n)return o.getValue();var i=arguments[1];return this.each((function(){t(this).data(a).setValue(i)}))}return this.each((function(){var n=t(this),o=n.data(a),i=t.isPlainObject(r)?r:{};if(o)o.init(i);else{var s=t.extend({},n.data());"string"==typeof s.fill&&(s.fill=JSON.parse(s.fill)),"string"==typeof s.animation&&(s.animation=JSON.parse(s.animation)),(i=t.extend(s,i)).el=n,o=new e(i),n.data(a,o)}}))}},void 0===(o="function"==typeof n?n.apply(e,a):n)||(t.exports=o)},521:(t,e,r)=>{"use strict";var n=r(7190),a=Array.prototype.concat,o=Array.prototype.slice,i=t.exports=function(t){for(var e=[],r=0,i=t.length;r<i;r++){var s=t[r];n(s)?e=a.call(e,o.call(s)):e.push(s)}return e};i.wrap=function(t){return function(){return t(i(arguments))}}},5998:t=>{"use strict";t.exports=H5P.jQuery}},e={};function r(n){var a=e[n];if(void 0!==a)return a.exports;var o=e[n]={exports:{}};return t[n](o,o.exports,r),o.exports}r.n=t=>{var e=t&&t.__esModule?()=>t.default:()=>t;return r.d(e,{a:e}),e},r.d=(t,e)=>{for(var n in e)r.o(e,n)&&!r.o(t,n)&&Object.defineProperty(t,n,{enumerable:!0,get:e[n]})},r.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(t){if("object"==typeof window)return window}}(),r.o=(t,e)=>Object.prototype.hasOwnProperty.call(t,e),(()=>{"use strict";r(3214),r(8410),r(2571),r(5901),r(252),r(4009),r(2189),r(1047),r(5769),r(7460),r(4078),r(3238),r(5849),r(1013),r(8010),r(3938),r(2410),r(2077),r(911),r(2274),r(2482),r(5613),r(895);function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}const e=function(){function e(){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e)}var r,n,a;return r=e,a=[{key:"extractFragmentsFromURL",value:function(t,e){if(!e.location.hash)return{};var r={};return e.location.hash.replace("#","").split("&").forEach((function(t){if(-1!==t.indexOf("=")){var e=t.split("=");r[e[0]]=e[1]}})),"function"!=typeof t||t(r)?r:{}}},{key:"createFragmentsString",value:function(t){var e=[];for(var r in t)e.push("".concat(r,"=").concat(t[r]));return"#".concat(e.join("&"))}},{key:"areFragmentsEqual",value:function(t,e){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:[];for(var n in t)if(t.hasOwnProperty(n)){if(r.length>0&&-1===r.indexOf(n))continue;if(!e[n]||t[n].toString()!==e[n].toString())return!1}return!0}}],(n=null)&&t(r.prototype,n),a&&t(r,a),Object.defineProperty(r,"prototype",{writable:!1}),e}();r(4844),r(3352),r(5610);function n(t){return n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},n(t)}function a(t,e){var r="undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(!r){if(Array.isArray(t)||(r=function(t,e){if(!t)return;if("string"==typeof t)return o(t,e);var r=Object.prototype.toString.call(t).slice(8,-1);"Object"===r&&t.constructor&&(r=t.constructor.name);if("Map"===r||"Set"===r)return Array.from(t);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return o(t,e)}(t))||e&&t&&"number"==typeof t.length){r&&(t=r);var n=0,a=function(){};return{s:a,n:function(){return n>=t.length?{done:!0}:{done:!1,value:t[n++]}},e:function(t){throw t},f:a}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var i,s=!0,c=!1;return{s:function(){r=r.call(t)},n:function(){var t=r.next();return s=t.done,t},e:function(t){c=!0,i=t},f:function(){try{s||null==r.return||r.return()}finally{if(c)throw i}}}}function o(t,e){(null==e||e>t.length)&&(e=t.length);for(var r=0,n=new Array(e);r<e;r++)n[r]=t[r];return n}function i(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}function s(t,e){return s=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t},s(t,e)}function c(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(t){return!1}}();return function(){var r,n=l(t);if(e){var a=l(this).constructor;r=Reflect.construct(n,arguments,a)}else r=n.apply(this,arguments);return u(this,r)}}function u(t,e){if(e&&("object"===n(e)||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t)}function l(t){return l=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},l(t)}const p=function(t){!function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&s(t,e)}(u,H5P.EventDispatcher);var e,r,n,o=c(u);function u(t,e,r,n){var a;return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,u),(a=o.call(this)).id=e,a.parent=n,a.behaviour=t.behaviour,a.content=document.createElement("ul"),a.content.classList.add("navigation-list"),a.container=a.addSideBar(),a.l10n=t.l10n,a.chapters=a.findAllChapters(t.chapters),a.chapterNodes=a.getChapterNodes(),r&&(a.titleElem=a.addMainTitle(r),a.container.appendChild(a.titleElem)),a.chapterNodes.forEach((function(t){a.content.appendChild(t)})),a.chapters.length>20&&a.content.classList.add("large-navigation-list"),a.container.appendChild(a.content),a.addTransformListener(),a.initializeNavigationControls(),a}return e=u,r=[{key:"initializeNavigationControls",value:function(){var t=this,e=Object.freeze({UP:38,DOWN:40});this.chapterNodes.forEach((function(r,n){r.querySelector(".h5p-interactive-book-navigation-chapter-button").addEventListener("keydown",(function(r){switch(r.keyCode){case e.UP:t.setFocusToChapterItem(n,-1),r.preventDefault();break;case e.DOWN:t.setFocusToChapterItem(n,1),r.preventDefault()}}));for(var a=r.querySelectorAll(".h5p-interactive-book-navigation-section"),o=function(r){a[r].querySelector(".section-button").addEventListener("keydown",(function(a){switch(a.keyCode){case e.UP:t.setFocusToSectionItem(n,r,-1),a.preventDefault();break;case e.DOWN:t.setFocusToSectionItem(n,r,1),a.preventDefault()}}))},i=0;i<a.length;i++)o(i)}))}},{key:"focus",value:function(){this.content.querySelector("button").focus()}},{key:"setFocusToChapterItem",value:function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,r=t+e;if(r<0?r=this.chapterNodes.length-1:r>this.chapterNodes.length-1&&(r=0),e){var n=e>0?t:r,a=this.chapterNodes[n];if(!a.classList.contains("h5p-interactive-book-navigation-closed")){var o=a.querySelectorAll(".h5p-interactive-book-navigation-section");if(o.length){var i=e>0?0:o.length-1;return void this.setFocusToSectionItem(n,i)}}}var s=this.chapterNodes[r],c=s.querySelector(".h5p-interactive-book-navigation-chapter-button");this.setFocusToItem(c,r)}},{key:"setFocusToSectionItem",value:function(t,e){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,n=this.chapterNodes[t],a=n.querySelectorAll(".h5p-interactive-book-navigation-section"),o=e+r;if(o>a.length-1)this.setFocusToChapterItem(t+1);else if(o<0)this.setFocusToChapterItem(t);else{var i=a[o],s=i.querySelector(".section-button");this.setFocusToItem(s,t)}}},{key:"setFocusToItem",value:function(t,e){var r=arguments.length>2&&void 0!==arguments[2]&&arguments[2];this.chapterNodes.forEach((function(t,r){var n=t.querySelector(".h5p-interactive-book-navigation-chapter-button");r===e?n.classList.add("h5p-interactive-book-navigation-current"):n.classList.remove("h5p-interactive-book-navigation-current"),n.setAttribute("tabindex","-1");for(var a=t.querySelectorAll(".h5p-interactive-book-navigation-section"),o=0;o<a.length;o++)a[o].querySelector(".section-button").setAttribute("tabindex","-1")})),t.setAttribute("tabindex","0"),this.focusedChapter=e,r||t.focus()}},{key:"addSideBar",value:function(){var t=document.createElement("div");return t.id="h5p-interactive-book-navigation-menu",t.classList.add("h5p-interactive-book-navigation"),t}},{key:"addMainTitle",value:function(t){var e=document.createElement("h2");e.classList.add("navigation-title"),e.innerHTML=t,e.setAttribute("title",t);var r=document.createElement("div");return r.classList.add("h5p-interactive-book-navigation-maintitle"),r.appendChild(e),r}},{key:"findSectionsInChapter",value:function(t){for(var e=[],r=t.params.content,n=0;n<r.length;n++){var a=r[n].content,o="";o="H5P.Link"===a.library.split(" ")[0]?a.params.title?a.params.title:"New link":a.metadata.title,e.push({title:o,id:a.subContentId?"h5p-interactive-book-section-".concat(a.subContentId):void 0})}return e}},{key:"findAllChapters",value:function(t){for(var e=[],r=0;r<t.length;r++){var n=this.findSectionsInChapter(t[r]),a=t[r].metadata.title,o="h5p-interactive-book-chapter-".concat(t[r].subContentId);e.push({sections:n,title:a,id:o,isSummary:!1})}return this.parent.hasSummary()&&e.push({sections:[],title:this.l10n.summaryHeader,id:"h5p-interactive-book-chapter-summary",isSummary:!0}),e}},{key:"toggleChapter",value:function(t,e){e=void 0!==e?e:!t.classList.contains("h5p-interactive-book-navigation-closed");var r=t.querySelector(".h5p-interactive-book-navigation-sectionlist"),n=t.getElementsByClassName("h5p-interactive-book-navigation-chapter-accordion")[0];t.querySelector(".h5p-interactive-book-navigation-chapter-button").setAttribute("aria-expanded",(!e).toString()),!0===e?(t.classList.add("h5p-interactive-book-navigation-closed"),n&&(n.classList.remove("icon-expanded"),n.classList.add("icon-collapsed"),r&&(r.setAttribute("aria-hidden",!0),r.setAttribute("tabindex","-1")))):(t.classList.remove("h5p-interactive-book-navigation-closed"),n&&(n.classList.remove("icon-collapsed"),n.classList.add("icon-expanded"),r&&(r.removeAttribute("aria-hidden"),r.removeAttribute("tabindex"))))}},{key:"redirectHandler",value:function(t){var e=this;if(this.chapterNodes.forEach((function(r,n){e.toggleChapter(r,n!==t)})),this.parent.trigger("resize"),t!==this.focusedChapter){var r=this.chapterNodes[t].querySelector(".h5p-interactive-book-navigation-chapter-button");this.setFocusToItem(r,t,!0)}}},{key:"resetIndicators",value:function(){var t=this;this.chapterNodes.forEach((function(e,r){t.updateChapterProgressIndicator(r,"BLANK");var n,o=a(e.getElementsByClassName("h5p-interactive-book-navigation-section"));try{for(o.s();!(n=o.n()).done;){var i=n.value.querySelector(".h5p-interactive-book-navigation-section-icon");i&&(i.classList.remove("icon-question-answered"),i.classList.add("icon-chapter-blank"))}}catch(t){o.e(t)}finally{o.f()}}))}},{key:"updateChapterProgressIndicator",value:function(t,e){if(this.behaviour.progressIndicators&&!this.chapters[t].isSummary){var r=this.chapterNodes[t].getElementsByClassName("h5p-interactive-book-navigation-chapter-progress")[0];"BLANK"===e?(r.classList.remove("icon-chapter-started"),r.classList.remove("icon-chapter-done"),r.classList.add("icon-chapter-blank")):"DONE"===e?(r.classList.remove("icon-chapter-blank"),r.classList.remove("icon-chapter-started"),r.classList.add("icon-chapter-done")):"STARTED"===e&&(r.classList.remove("icon-chapter-blank"),r.classList.remove("icon-chapter-done"),r.classList.add("icon-chapter-started"))}}},{key:"setSectionMarker",value:function(t,e){var r=this.chapterNodes[t].querySelector(".h5p-interactive-book-navigation-section-"+e+" .h5p-interactive-book-navigation-section-icon");r&&(r.classList.remove("icon-chapter-blank"),r.classList.add("icon-question-answered"))}},{key:"getNodesFromChapter",value:function(t,e){var r=this,n=document.createElement("li"),a="h5p-interactive-book-sectionlist-"+e;if(n.classList.add("h5p-interactive-book-navigation-chapter"),t.isSummary){n.classList.add("h5p-interactive-book-navigation-summary-button");var o=this.parent.chapters[e].instance.summaryMenuButton;return o.classList.add("h5p-interactive-book-navigation-chapter-button"),n.appendChild(o),n}var i=document.createElement("div");i.classList.add("h5p-interactive-book-navigation-chapter-accordion");var s=document.createElement("div");s.classList.add("h5p-interactive-book-navigation-chapter-title-text"),s.innerHTML=t.title,s.setAttribute("title",t.title);var c=document.createElement("div");this.behaviour.progressIndicators&&(c.classList.add("icon-chapter-blank"),c.classList.add("h5p-interactive-book-navigation-chapter-progress"));var u=document.createElement("button");u.setAttribute("tabindex",0===e?"0":"-1"),u.classList.add("h5p-interactive-book-navigation-chapter-button"),this.parent.activeChapter!==e?(i.classList.add("icon-collapsed"),u.setAttribute("aria-expanded","false")):(i.classList.add("icon-expanded"),u.setAttribute("aria-expanded","true")),u.setAttribute("aria-controls",a),u.onclick=function(t){var n=!t.currentTarget.querySelector(".h5p-interactive-book-navigation-chapter-accordion").classList.contains("hidden"),a="true"===t.currentTarget.getAttribute("aria-expanded");if(r.isOpenOnMobile()&&r.parent.trigger("toggleMenu"),r.isOpenOnMobile()||!n||!a){var o={h5pbookid:r.parent.contentId,chapter:r.chapters[e].id,section:0};r.parent.trigger("newChapter",o)}n&&(r.toggleChapter(t.currentTarget.parentElement),r.parent.trigger("resize"))},u.appendChild(i),u.appendChild(s),u.appendChild(c),n.appendChild(u),this.parent.activeChapter===e?n.querySelector(".h5p-interactive-book-navigation-chapter-button").classList.add("h5p-interactive-book-navigation-current"):this.toggleChapter(n,!0);var l=document.createElement("ul");l.classList.add("h5p-interactive-book-navigation-sectionlist"),l.id=a;for(var p=[],h=0;h<this.chapters[e].sections.length;h++)if(this.parent.chapters[e].sections[h].isTask){var d=this.createSectionLink(e,h);p.push(d),l.appendChild(d)}else{var f=this.parent.params.chapters[e].params.content[h].content;if("H5P.AdvancedText"===f.library.split(" ")[0]){var v=document.createElement("div");v.innerHTML=f.params.text;for(var m=v.querySelectorAll("h2, h3"),b=0;b<m.length;b++){var g=m[b],y=this.createSectionLink(e,h,g.textContent,b);p.push(y),l.appendChild(y)}}}if(t.tasksLeft&&(t.maxTasks=t.tasksLeft),0===p.length){var k=n.querySelector(".h5p-interactive-book-navigation-chapter-accordion");k&&k.classList.add("hidden")}return n.appendChild(l),n}},{key:"createSectionLink",value:function(t,e){var r=this,n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:null,a=arguments.length>3&&void 0!==arguments[3]?arguments[3]:null,o=this.chapters[t].sections[e],i=document.createElement("div");i.innerHTML=n||o.title,i.setAttribute("title",n||o.title),i.classList.add("h5p-interactive-book-navigation-section-title");var s=document.createElement("div");s.classList.add("h5p-interactive-book-navigation-section-icon"),s.classList.add("icon-chapter-blank"),this.parent.chapters[t].sections[e].isTask&&s.classList.add("h5p-interactive-book-navigation-section-task");var c=document.createElement("button");c.classList.add("section-button"),c.setAttribute("tabindex","-1"),c.onclick=function(e){var n={h5pbookid:r.parent.contentId,chapter:r.chapters[t].id,section:o.id};null!==a&&(n.headerNumber=a),r.parent.trigger("newChapter",n),r.isOpenOnMobile()&&r.parent.trigger("toggleMenu"),e.preventDefault()},c.appendChild(s),c.appendChild(i);var u=document.createElement("li");return u.classList.add("h5p-interactive-book-navigation-section"),u.classList.add("h5p-interactive-book-navigation-section-"+e),u.appendChild(c),u}},{key:"getChapterNodes",value:function(){var t=this;return this.chapters.map((function(e,r){return t.getNodesFromChapter(e,r)}))}},{key:"isOpenOnMobile",value:function(){return this.parent.isMenuOpen()&&this.parent.isSmallSurface()}},{key:"addTransformListener",value:function(){var t=this;this.container.addEventListener("transitionend",(function(e){"flex-basis"===e.propertyName&&t.parent.trigger("resize")}))}}],r&&i(e.prototype,r),n&&i(e,n),Object.defineProperty(e,"prototype",{writable:!1}),u}();function h(t){return h="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},h(t)}function d(){return d=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var r=arguments[e];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(t[n]=r[n])}return t},d.apply(this,arguments)}function f(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}function v(t,e){return v=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t},v(t,e)}function m(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(t){return!1}}();return function(){var r,n=g(t);if(e){var a=g(this).constructor;r=Reflect.construct(n,arguments,a)}else r=n.apply(this,arguments);return b(this,r)}}function b(t,e){if(e&&("object"===h(e)||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t)}function g(t){return g=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},g(t)}const y=function(t){!function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&v(t,e)}(o,H5P.EventDispatcher);var e,r,n,a=m(o);function o(t,e,r,n,i){var s;!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,o),(s=a.call(this)).id=t,s.parent=r,s.params=n||{},s.params.l10n=n.l10n,s.params.a11y=d({progress:"Page @page of @total",menu:"Toggle navigation menu"},s.params.a11y||{}),s.totalChapters=e,s.arrows=s.addArrows(),s.progressBar=s.createProgressBar(),s.progressIndicator=s.createProgressIndicator(),s.chapterTitle=s.createChapterTitle(),s.menuToggleButton=s.createMenuToggleButton();var c=document.createElement("div");return c.classList.add("h5p-interactive-book-status"),s.params.displayToTopButton&&c.appendChild(s.createToTopButton()),s.params.displayFullScreenButton&&H5P.fullscreenSupported&&c.appendChild(s.createFullScreenButton()),c.appendChild(s.arrows.buttonWrapperNext),c.appendChild(s.arrows.buttonWrapperPrevious),s.params.displayMenuToggleButton&&c.appendChild(s.menuToggleButton),c.appendChild(s.progressIndicator.wrapper),c.appendChild(s.chapterTitle.wrapper),s.wrapper=document.createElement("div"),s.wrapper.classList.add(i),s.wrapper.setAttribute("tabindex","-1"),s.wrapper.appendChild(s.progressBar.wrapper),s.wrapper.appendChild(c),s.on("updateStatusBar",s.updateStatusBar),s.on("seqChapter",(function(t){var e={h5pbookid:s.parent.contentId};t.data.toTop&&(e.section="top"),"next"===t.data.direction?s.parent.activeChapter+1<s.parent.chapters.length?e.chapter="h5p-interactive-book-chapter-".concat(s.parent.chapters[s.parent.activeChapter+1].instance.subContentId):s.parent.hasSummary()&&s.parent.activeChapter+1===s.parent.chapters.length&&s.parent.trigger("viewSummary",e):"prev"===t.data.direction&&s.parent.activeChapter>0&&(e.chapter="h5p-interactive-book-chapter-".concat(s.parent.chapters[s.parent.activeChapter-1].instance.subContentId)),e.chapter&&s.parent.trigger("newChapter",e)})),s}return e=o,(r=[{key:"updateProgressBar",value:function(t){var e="".concat(t/this.totalChapters*100,"%");this.progressBar.progress.style.width=e;var r=this.params.a11y.progress.replace("@page",t).replace("@total",this.totalChapters);this.progressBar.progress.title=r}},{key:"updateA11yProgress",value:function(t){this.progressIndicator.hiddenButRead.innerHTML=this.params.a11y.progress.replace("@page",t).replace("@total",this.totalChapters)}},{key:"updateStatusBar",value:function(){var t=this.parent.getActiveChapter()+1,e=this.parent.chapters[t-1].title;this.progressIndicator.current.innerHTML=t,this.updateA11yProgress(t),this.updateProgressBar(t),this.chapterTitle.text.innerHTML=e,this.chapterTitle.text.setAttribute("title",e),this.parent.activeChapter<=0?this.setButtonStatus("Previous",!0):this.setButtonStatus("Previous",!1),this.parent.activeChapter+1>=this.totalChapters?this.setButtonStatus("Next",!0):this.setButtonStatus("Next",!1)}},{key:"addArrows",value:function(){var t=this,e={};return e.buttonPrevious=document.createElement("div"),e.buttonPrevious.classList.add("navigation-button","icon-previous"),e.buttonPrevious.setAttribute("title",this.params.l10n.previousPage),e.buttonWrapperPrevious=document.createElement("button"),e.buttonWrapperPrevious.classList.add("h5p-interactive-book-status-arrow","h5p-interactive-book-status-button","previous"),e.buttonWrapperPrevious.setAttribute("aria-label",this.params.l10n.previousPage),e.buttonWrapperPrevious.onclick=function(){t.trigger("seqChapter",{direction:"prev",toTop:!0})},e.buttonWrapperPrevious.appendChild(e.buttonPrevious),e.buttonNext=document.createElement("div"),e.buttonNext.classList.add("navigation-button","icon-next"),e.buttonNext.setAttribute("title",this.params.l10n.nextPage),e.buttonWrapperNext=document.createElement("button"),e.buttonWrapperNext.classList.add("h5p-interactive-book-status-arrow","h5p-interactive-book-status-button","next"),e.buttonWrapperNext.setAttribute("aria-label",this.params.l10n.nextPage),e.buttonWrapperNext.onclick=function(){t.trigger("seqChapter",{direction:"next",toTop:!0})},e.buttonWrapperNext.appendChild(e.buttonNext),e}},{key:"createMenuToggleButton",value:function(){var t=this,e=document.createElement("a");e.classList.add("icon-menu");var r=document.createElement("button");return r.classList.add("h5p-interactive-book-status-menu"),r.classList.add("h5p-interactive-book-status-button"),r.setAttribute("aria-label",this.params.a11y.menu),r.setAttribute("aria-expanded","false"),r.setAttribute("aria-controls","h5p-interactive-book-navigation-menu"),r.onclick=function(){t.parent.trigger("toggleMenu")},r.appendChild(e),r}},{key:"isMenuOpen",value:function(){return this.menuToggleButton.classList.contains("h5p-interactive-book-status-menu-active")}},{key:"createProgressBar",value:function(){var t=document.createElement("div");t.classList.add("h5p-interactive-book-status-progressbar-front"),t.setAttribute("tabindex","-1");var e=document.createElement("div");return e.classList.add("h5p-interactive-book-status-progressbar-back"),e.appendChild(t),{wrapper:e,progress:t}}},{key:"createChapterTitle",value:function(){var t=document.createElement("h1");t.classList.add("title");var e=document.createElement("div");return e.classList.add("h5p-interactive-book-status-chapter"),e.appendChild(t),{wrapper:e,text:t}}},{key:"createToTopButton",value:function(){var t=this,e=document.createElement("div");e.classList.add("icon-up"),e.classList.add("navigation-button");var r=document.createElement("button");return r.classList.add("h5p-interactive-book-status-to-top"),r.classList.add("h5p-interactive-book-status-button"),r.classList.add("h5p-interactive-book-status-arrow"),r.setAttribute("aria-label",this.params.l10n.navigateToTop),r.addEventListener("click",(function(){t.parent.trigger("scrollToTop"),document.querySelector(".h5p-interactive-book-status-menu").focus()})),r.appendChild(e),r}},{key:"setVisibility",value:function(t){t?this.wrapper.classList.add("footer-hidden"):this.wrapper.classList.remove("footer-hidden")}},{key:"createProgressIndicator",value:function(){var t=document.createElement("span");t.classList.add("h5p-interactive-book-status-progress-number"),t.setAttribute("aria-hidden","true");var e=document.createElement("span");e.classList.add("h5p-interactive-book-status-progress-divider"),e.innerHTML=" / ",e.setAttribute("aria-hidden","true");var r=document.createElement("span");r.classList.add("h5p-interactive-book-status-progress-number"),r.innerHTML=this.totalChapters,r.setAttribute("aria-hidden","true");var n=document.createElement("p");n.classList.add("hidden-but-read");var a=document.createElement("p");a.classList.add("h5p-interactive-book-status-progress"),a.appendChild(t),a.appendChild(e),a.appendChild(r),a.appendChild(n);var o=document.createElement("div");return o.classList.add("h5p-interactive-book-status-progress-wrapper"),o.appendChild(a),{wrapper:o,current:t,total:r,divider:e,progressText:a,hiddenButRead:n}}},{key:"setButtonStatus",value:function(t,e){e?(this.arrows["buttonWrapper"+t].setAttribute("disabled","disabled"),this.arrows["button"+t].classList.add("disabled")):(this.arrows["buttonWrapper"+t].removeAttribute("disabled"),this.arrows["button"+t].classList.remove("disabled"))}},{key:"createFullScreenButton",value:function(){var t=this,e=function(){!0===H5P.isFullscreen?H5P.exitFullScreen():H5P.fullScreen(t.parent.mainWrapper,t.parent)},r=document.createElement("button");return r.classList.add("h5p-interactive-book-status-fullscreen"),r.classList.add("h5p-interactive-book-status-button"),r.classList.add("h5p-interactive-book-enter-fullscreen"),r.setAttribute("title",this.params.l10n.fullscreen),r.setAttribute("aria-label",this.params.l10n.fullscreen),r.addEventListener("click",e),r.addEventListener("keyPress",(function(t){13!==t.which&&32!==t.which||(e(),t.preventDefault())})),this.parent.on("enterFullScreen",(function(){t.parent.isFullscreen=!0,r.classList.remove("h5p-interactive-book-enter-fullscreen"),r.classList.add("h5p-interactive-book-exit-fullscreen"),r.setAttribute("title",t.params.l10n.exitFullscreen),r.setAttribute("aria-label",t.params.l10n.exitFullScreen),t.parent.pageContent.updateFooter()})),this.parent.on("exitFullScreen",(function(){t.parent.isFullscreen=!1,r.classList.remove("h5p-interactive-book-exit-fullscreen"),r.classList.add("h5p-interactive-book-enter-fullscreen"),r.setAttribute("title",t.params.l10n.fullscreen),r.setAttribute("aria-label",t.params.l10n.fullscreen),t.parent.pageContent.updateFooter()})),r}}])&&f(e.prototype,r),n&&f(e,n),Object.defineProperty(e,"prototype",{writable:!1}),o}();function k(t){return k="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},k(t)}function w(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}function C(t,e){return C=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t},C(t,e)}function S(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(t){return!1}}();return function(){var r,n=O(t);if(e){var a=O(this).constructor;r=Reflect.construct(n,arguments,a)}else r=n.apply(this,arguments);return x(this,r)}}function x(t,e){if(e&&("object"===k(e)||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t)}function O(t){return O=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},O(t)}const E=function(t){!function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&C(t,e)}(o,H5P.EventDispatcher);var e,r,n,a=S(o);function o(t,e,r,n,i){var s;return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,o),(s=a.call(this)).parent=i,s.params=t,s.contentId=n,s.container=s.createContainer(),t.coverMedium?(s.visuals=s.createVisualsElement(t.coverMedium),s.visuals&&s.container.appendChild(s.visuals)):s.container.classList.add("h5p-cover-nographics"),s.container.appendChild(s.createTitleElement(e)),t.coverDescription&&s.container.appendChild(s.createDescriptionElement(t.coverDescription)),s.container.appendChild(s.createReadButton(r)),s}return e=o,(r=[{key:"createContainer",value:function(){var t=document.createElement("div");return t.classList.add("h5p-interactive-book-cover"),t}},{key:"createVisualsElement",value:function(t){if(!t||!t.params)return null;var e=document.createElement("div");return e.classList.add("h5p-interactive-book-cover-graphics"),e}},{key:"initMedia",value:function(){if(this.visuals&&this.params.coverMedium){var t=this.params.coverMedium;if("H5P.Video"===(t.library||"").split(" ")[0]&&(t.params.visuals.fit=!1),H5P.newRunnable(t,this.contentId,H5P.jQuery(this.visuals),!1,{metadata:t.medatata}),"H5P.Image"===(t.library||"").split(" ")[0]){var e=this.visuals.querySelector("img")||this.visuals.querySelector(".h5p-placeholder");e.style.height="auto",e.style.width="auto"}this.visuals.appendChild(this.createCoverBar())}}},{key:"createImage",value:function(t,e,r){var n=document.createElement("img");return n.classList.add("h5p-interactive-book-cover-image"),n.src=H5P.getPath(t,e),n.setAttribute("draggable","false"),r&&(n.alt=r),n}},{key:"createCoverBar",value:function(){var t=document.createElement("div");return t.classList.add("h5p-interactive-book-cover-bar"),t}},{key:"createTitleElement",value:function(t){var e=document.createElement("p");e.innerHTML=t;var r=document.createElement("div");return r.classList.add("h5p-interactive-book-cover-title"),r.appendChild(e),r}},{key:"createDescriptionElement",value:function(t){if(!t)return null;var e=document.createElement("div");return e.classList.add("h5p-interactive-book-cover-description"),e.innerHTML=t,e}},{key:"createReadButton",value:function(t){var e=this,r=document.createElement("button");r.innerHTML=t,r.onclick=function(){e.removeCover()};var n=document.createElement("div");return n.classList.add("h5p-interactive-book-cover-readbutton"),n.appendChild(r),n}},{key:"removeCover",value:function(){this.container.parentElement.classList.remove("covered"),this.container.parentElement.removeChild(this.container),this.hidden=!0,this.parent.trigger("coverRemoved")}}])&&w(e.prototype,r),n&&w(e,n),Object.defineProperty(e,"prototype",{writable:!1}),o}();r(7159);var L=r(7124),P=r.n(L);function A(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}var T=function(){function t(){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t)}var e,r,n;return e=t,n=[{key:"setBase",value:function(e){e&&(t.colorBase=P()(e),t.colorText=[t.DEFAULT_COLOR_BG,t.computeContrastColor(t.colorBase),t.computeContrastColor(t.colorBase,t.DEFAULT_COLOR_BG)].map((function(e){return{color:e,contrast:t.colorBase.contrast(e)}})).reduce((function(t,e){return e.contrast>t.contrast?e:t}),{contrast:0}).color)}},{key:"getColor",value:function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if("string"==typeof e.opacity&&/^([0-9]|[1-8][0-9]|9[0-9]|100)(\.\d+)?\s?%$/.test(e.opacity)&&(e.opacity=parseInt(e.opacity)/100),"number"!=typeof e.opacity||e.opacity<0||e.opacity>1)return t;var r=P()("#ffffff").rgb().array();return P().rgb(t.rgb().array().map((function(t,n){return e.opacity*t+(1-e.opacity)*r[n]})))}},{key:"isBaseColor",value:function(e){return P()(e).hex()===t.colorBase.hex()}},{key:"computeContrastColor",value:function(e,r){for(var n,a=(r=r||e).luminosity(),o=function(o){if((n=P().rgb(e.rgb().array().map((function(t){return t*(a>.5?1-o:1+o)})))).contrast(r)>=t.MINIMUM_ACCEPTABLE_CONTRAST)return"break"},i=0;i<=1&&"break"!==o(i);i+=.05);return n}},{key:"getContentTypeCSS",value:function(e){return t.COLOR_OVERRIDES[e]?t.COLOR_OVERRIDES[e].getCSS():""}},{key:"getCSS",value:function(){return":root{\n      --color-base: ".concat(t.colorBase,";\n      --color-base-5: ").concat(t.getColor(t.colorBase,{opacity:.05}),";\n      --color-base-10: ").concat(t.getColor(t.colorBase,{opacity:.1}),";\n      --color-base-20: ").concat(t.getColor(t.colorBase,{opacity:.2}),";\n      --color-base-75: ").concat(t.getColor(t.colorBase,{opacity:.75}),";\n      --color-base-80: ").concat(t.getColor(t.colorBase,{opacity:.8}),";\n      --color-base-85: ").concat(t.getColor(t.colorBase,{opacity:.85}),";\n      --color-base-90: ").concat(t.getColor(t.colorBase,{opacity:.9}),";\n      --color-base-95: ").concat(t.getColor(t.colorBase,{opacity:.95}),";\n      --color-text: ").concat(t.colorText,";\n      --color-contrast: ").concat(t.computeContrastColor(t.colorBase,t.DEFAULT_COLOR_BG),";\n    }")}}],(r=null)&&A(e.prototype,r),n&&A(e,n),Object.defineProperty(e,"prototype",{writable:!1}),t}();function j(t){return j="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},j(t)}function I(t,e){var r="undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(!r){if(Array.isArray(t)||(r=function(t,e){if(!t)return;if("string"==typeof t)return M(t,e);var r=Object.prototype.toString.call(t).slice(8,-1);"Object"===r&&t.constructor&&(r=t.constructor.name);if("Map"===r||"Set"===r)return Array.from(t);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return M(t,e)}(t))||e&&t&&"number"==typeof t.length){r&&(t=r);var n=0,a=function(){};return{s:a,n:function(){return n>=t.length?{done:!0}:{done:!1,value:t[n++]}},e:function(t){throw t},f:a}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var o,i=!0,s=!1;return{s:function(){r=r.call(t)},n:function(){var t=r.next();return i=t.done,t},e:function(t){s=!0,o=t},f:function(){try{i||null==r.return||r.return()}finally{if(s)throw o}}}}function M(t,e){(null==e||e>t.length)&&(e=t.length);for(var r=0,n=new Array(e);r<e;r++)n[r]=t[r];return n}function B(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}function F(t,e){return F=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t},F(t,e)}function R(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(t){return!1}}();return function(){var r,n=D(t);if(e){var a=D(this).constructor;r=Reflect.construct(n,arguments,a)}else r=n.apply(this,arguments);return N(this,r)}}function N(t,e){if(e&&("object"===j(e)||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t)}function D(t){return D=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},D(t)}T.DEFAULT_COLOR_BASE=P()("#1768c4"),T.DEFAULT_COLOR_BG=P()("#ffffff"),T.MINIMUM_ACCEPTABLE_CONTRAST=4.5,T.colorBase=T.DEFAULT_COLOR_BASE,T.colorText=T.DEFAULT_COLOR_BG;const H=function(t){!function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&F(t,e)}(o,H5P.EventDispatcher);var e,r,n,a=R(o);function o(t,e,r){var n;return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,o),(n=a.call(this)).parent=e,n.behaviour=t.behaviour,n.l10n=t.l10n,n.chapters=r||[],n.subContentId="summary",n.wrapper=null,n.summaryMenuButton=n.createSummaryButton(),n.filterActionAll="all",n.filterActionUnanswered="unanswered",n.bookCompleted=!1,n.tempState=JSON.stringify(n.parent.previousState&&n.parent.previousState.chapters?n.parent.previousState.chapters:n.getChapterStats()),e.on("bookCompleted",(function(t){return n.setBookComplete(t.data.completed)})),e.on("toggleMenu",(function(){var t=document.querySelector(".h5p-interactive-book-summary-footer");t&&n.bookCompleted&&(n.parent.isMenuOpen()?t.classList.add("menu-open"):t.classList.remove("menu-open"))})),n}return e=o,r=[{key:"setBookComplete",value:function(t){var e=this.parent.mainWrapper?this.parent.mainWrapper[0].querySelector(".h5p-interactive-book-summary-footer"):null;!e&&this.parent.isSmallSurface()&&((e=document.createElement("div")).classList.add("h5p-interactive-book-summary-footer"),e.appendChild(this.createSummaryButton()),this.parent.mainWrapper.append(e)),e&&t&&setTimeout((function(){return e.classList.add("show-footer")}),0),this.bookCompleted=t,Array.from(document.querySelectorAll(".h5p-interactive-book-summary-menu-button")).forEach((function(e){return e.setAttribute("data-book-completed",t.toString())}))}},{key:"setChapters",value:function(t){this.chapters=Array.isArray(t)?t:[]}},{key:"setSummaryMenuButtonDisabled",value:function(){var t=!(arguments.length>0&&void 0!==arguments[0])||arguments[0];this.summaryMenuButton.disabled=t}},{key:"setFilter",value:function(t){var e=this,r=this.wrapper.querySelector(".h5p-interactive-book-summary-overview-list"),n=Array.from(r.querySelectorAll(".h5p-interactive-book-summary-overview-section"));n.forEach((function(t){t.classList.remove("h5p-interactive-book-summary-top-section"),t.classList.remove("h5p-interactive-book-summary-bottom-section")}));var a=r.querySelector(".h5p-interactive-book-summary-overview-list-empty");if(a.style.display="none",t===this.filterActionUnanswered){r.classList.add("h5p-interactive-book-summary-overview-list-only-unanswered");var o=n.filter((function(t){return!t.classList.contains("h5p-interactive-book-summary-no-interactions")}));o.length?(o[0].classList.add("h5p-interactive-book-summary-top-section"),o[o.length-1].classList.add("h5p-interactive-book-summary-bottom-section")):a.style.display="block"}else t===this.filterActionAll&&r.classList.remove("h5p-interactive-book-summary-overview-list-only-unanswered");setTimeout((function(){return e.trigger("resize")}),1)}},{key:"createSummaryButton",value:function(){var t=this,e=document.createElement("button");e.classList.add("h5p-interactive-book-summary-menu-button"),e.onclick=function(){var e={h5pbookid:t.parent.contentId,chapter:"h5p-interactive-book-chapter-summary",section:"top"};t.parent.trigger("newChapter",e),t.parent.isMenuOpen()&&t.parent.isSmallSurface()&&t.parent.trigger("toggleMenu")};var r=document.createElement("span");r.classList.add("h5p-interactive-book-summary-icon"),r.classList.add("icon-paper"),r.setAttribute("aria-hidden","true");var n=document.createElement("span");n.classList.add("h5p-interactive-book-summary-text"),n.innerHTML=this.l10n.summaryAndSubmit;var a=document.createElement("span");return a.classList.add("h5p-interactive-book-summary-menu-button-arrow"),a.classList.add("icon-up"),a.setAttribute("aria-hidden","true"),e.appendChild(r),e.appendChild(n),e.appendChild(a),e}},{key:"createCircle",value:function(t){var e=T.computeContrastColor(T.colorBase,T.DEFAULT_COLOR_BG),r=document.createElement("div");return r.classList.add("h5p-interactive-book-summary-progress-circle"),r.setAttribute("data-value",t),r.setAttribute("data-start-angle",-Math.PI/3),r.setAttribute("data-thickness",13),r.setAttribute("data-empty-fill","rgba(".concat(e.rgb().array().join(", "),", .1)")),r.setAttribute("data-fill",JSON.stringify({color:e.hex()})),r}},{key:"createProgress",value:function(t,e,r,n){var a=arguments.length>4&&void 0!==arguments[4]&&arguments[4],o=arguments.length>5?arguments[5]:void 0,i=arguments.length>6?arguments[6]:void 0,s=document.createElement("div"),c=document.createElement("h3");c.innerHTML=t;var u=100*r/n;void 0===o&&(o=r),void 0===i&&(i=n);var l=document.createElement("p");if(l.classList.add("h5p-interactive-book-summary-progressbox-bigtext"),l.innerHTML=Math.round(u)+"%",a){var p=document.createElement("span");p.classList.add("absolute-value"),p.innerHTML=r;var h=document.createElement("span");h.classList.add("separator"),h.innerHTML="/";var d=document.createElement("span");d.classList.add("absolute-value"),d.innerHTML=n,l.innerHTML="",l.appendChild(p),l.appendChild(h),l.appendChild(d)}var f=document.createElement("span");f.classList.add("h5p-interactive-book-summary-progressbox-smalltext"),f.innerHTML=e.replace("@count",o).replace("@total",i),s.appendChild(c),s.appendChild(l),s.appendChild(f);var v=document.createElement("div");return v.appendChild(s),v.appendChild(this.createCircle(r/n)),v}},{key:"addScoreProgress",value:function(){var t,e=0,r=0,n=I(this.chapters);try{for(n.s();!(t=n.n()).done;){var a=t.value;e+=a.maxTasks,r+=a.tasksLeft}}catch(t){n.e(t)}finally{n.f()}var o=this.createProgress(this.l10n.totalScoreLabel,this.l10n.interactionsProgressSubtext,this.parent.getScore(),this.parent.getMaxScore(),!0,Math.max(e-r,0),e);o.classList.add("h5p-interactive-book-summary-progress-container"),o.classList.add("h5p-interactive-book-summary-score-progress");var i=o.querySelector(".h5p-interactive-book-summary-progress-circle");return i.setAttribute("data-empty-fill","rgb(198, 220, 212)"),i.setAttribute("data-fill",JSON.stringify({color:"#0e7c57"})),o}},{key:"addBookProgress",value:function(){var t=this.createProgress(this.l10n.bookProgress,this.l10n.bookProgressSubtext,this.chapters.filter((function(t){return t.completed})).length,this.chapters.length);return t.classList.add("h5p-interactive-book-summary-progress-container"),t.classList.add("h5p-interactive-book-summary-book-progress"),t}},{key:"addInteractionsProgress",value:function(){var t,e=0,r=0,n=I(this.chapters);try{for(n.s();!(t=n.n()).done;){var a=t.value;e+=a.maxTasks,r+=a.tasksLeft}}catch(t){n.e(t)}finally{n.f()}var o=this.createProgress(this.l10n.interactionsProgress,this.l10n.interactionsProgressSubtext,Math.max(e-r,0),e);return o.classList.add("h5p-interactive-book-summary-progress-container"),o.classList.add("h5p-interactive-book-summary-interactions-progress"),o}},{key:"addProgressIndicators",value:function(){if(this.behaviour.progressIndicators){var t=document.createElement("div");t.classList.add("h5p-interactive-box-summary-progress"),t.appendChild(this.addScoreProgress()),t.appendChild(this.addBookProgress()),t.appendChild(this.addInteractionsProgress()),setTimeout((function(){return H5P.jQuery(".h5p-interactive-book-summary-progress-circle").circleProgress()}),100),this.wrapper.appendChild(t)}}},{key:"addActionButtons",value:function(){var t=this,e=document.createElement("div");if(e.classList.add("h5p-interactive-book-summary-buttons"),this.checkTheAnswerIsUpdated(),this.parent.isSubmitButtonEnabled&&this.parent.isAnswerUpdated){var r=this.addButton("icon-paper-pencil",this.l10n.submitReport);r.classList.add("h5p-interactive-book-summary-submit"),r.onclick=function(){t.trigger("submitted"),t.parent.triggerXAPIScored(t.parent.getScore(),t.parent.getMaxScore(),"completed"),e.classList.add("submitted"),e.querySelector(".answers-submitted").focus(),t.tempState=JSON.stringify(t.getChapterStats()),t.parent.isAnswerUpdated=!1},e.appendChild(r)}e.appendChild(this.createRestartButton()),e.appendChild(this.createSubmittedConfirmation()),this.wrapper.appendChild(e)}},{key:"createRestartButton",value:function(){var t=this,e=this.addButton("icon-restart",this.l10n.restartLabel);return e.classList.add("h5p-interactive-book-summary-restart"),e.onclick=function(){return t.parent.resetTask()},e}},{key:"createSubmittedConfirmation",value:function(){var t=document.createElement("div");t.classList.add("h5p-interactive-book-summary-submitted");var e=document.createElement("span");e.classList.add("icon-chapter-done"),e.classList.add("icon-check-mark"),t.appendChild(e);var r=document.createElement("p");return r.innerHTML=this.l10n.yourAnswersAreSubmittedForReview,r.tabIndex=-1,r.classList.add("answers-submitted"),t.appendChild(r),t.appendChild(this.createRestartButton()),t}},{key:"addButton",value:function(t,e){var r=document.createElement("button");r.type="button",r.classList.add("h5p-interactive-book-summary-button"),r.innerHTML=e;var n=document.createElement("span");return n.classList.add(t),n.setAttribute("aria-hidden","true"),r.appendChild(n),r}},{key:"createSectionList",value:function(t,e){var r,n=this,a=[],o=!1,i=I(t);try{var s=function(){var t=r.value,i=document.createElement("li");if(i.classList.add("h5p-interactive-book-summary-overview-section-details"),n.behaviour.progressIndicators){var s=document.createElement("span");s.classList.add("h5p-interactive-book-summary-section-icon"),s.classList.add(t.taskDone?"icon-chapter-done":"icon-chapter-blank"),i.appendChild(s)}var c=document.createElement("button");c.type="button",c.classList.add("h5p-interactive-book-summary-section-title"),c.onclick=function(){var r={h5pbookid:n.parent.contentId,chapter:"h5p-interactive-book-chapter-".concat(e),section:"h5p-interactive-book-section-".concat(t.instance.subContentId)};n.parent.trigger("newChapter",r)};var u=t.instance.contentData&&t.instance.contentData.metadata&&t.instance.contentData.metadata.title,l=t.content&&t.content.metadata&&t.content.metadata.title;c.innerHTML=u||l||"Untitled";var p=document.createElement("div");p.classList.add("h5p-interactive-book-summary-section-score"),p.innerHTML="-","function"==typeof t.instance.getScore&&(p.innerHTML=n.l10n.scoreText.replace("@score",t.instance.getScore()).replace("@maxscore",t.instance.getMaxScore())),t.taskDone?i.classList.add("h5p-interactive-book-summary-overview-section-details-task-done"):o=!0,i.appendChild(c),i.appendChild(p),a.push(i)};for(i.s();!(r=i.n()).done;)s()}catch(t){i.e(t)}finally{i.f()}if(a.length){var c=document.createElement("div");c.classList.add("h5p-interactive-book-summary-overview-section-score-header");var u=document.createElement("div");u.innerHTML=this.l10n.score,c.appendChild(u),a.unshift(c)}return{hasUnansweredInteractions:o,sectionElements:a}}},{key:"createChapterOverview",value:function(t){var e=this,r=document.createElement("li");r.classList.add("h5p-interactive-book-summary-overview-section");var n=document.createElement("h4");n.onclick=function(){var r={h5pbookid:e.parent.contentId,chapter:"h5p-interactive-book-chapter-".concat(t.instance.subContentId),section:"top"};e.parent.trigger("newChapter",r)};var a=document.createElement("span");if(a.innerHTML=t.title,n.appendChild(a),this.behaviour.progressIndicators){var o=document.createElement("span"),i=this.parent.getChapterStatus(t);o.classList.add("icon-chapter-".concat(i.toLowerCase())),n.appendChild(o)}r.appendChild(n);var s=this.createSectionList(t.sections.filter((function(t){return t.isTask})),t.instance.subContentId),c=s.sectionElements;!1===s.hasUnansweredInteractions&&r.classList.add("h5p-interactive-book-summary-no-interactions");var u=document.createElement("div");u.classList.add("h5p-interactive-book-summary-chapter-subheader"),t.maxTasks?u.innerHTML=this.l10n.leftOutOfTotalCompleted.replace("@left",Math.max(t.maxTasks-t.tasksLeft,0)).replace("@max",t.maxTasks):u.innerHTML=this.l10n.noInteractions,r.appendChild(u);var l=document.createElement("ul");return c.length&&c.map((function(t){return l.appendChild(t)})),r.appendChild(l),r}},{key:"createFilterDropdown",value:function(){var t=this,e=function(e,o){var i=document.createElement("li");i.role="menuitem";var s=document.createElement("button");return s.textContent=e,s.type="button",s.onclick=function(e){t.setFilter(o),r.removeAttribute("active"),n.setAttribute("aria-expanded","false"),a.textContent=e.currentTarget.innerHTML},i.appendChild(s),i},r=document.createElement("div");r.classList.add("h5p-interactive-book-summary-dropdown");var n=document.createElement("button");n.setAttribute("aria-haspopup","true"),n.setAttribute("aria-expanded","false"),n.type="button",n.onclick=function(){r.hasAttribute("active")?(r.removeAttribute("active"),n.setAttribute("aria-expanded","false")):(r.setAttribute("active",""),n.setAttribute("aria-expanded","true"),n.focus())};var a=document.createElement("span");a.textContent=this.l10n.allInteractions,n.appendChild(a);var o=document.createElement("span");o.classList.add("h5p-interactive-book-summary-dropdown-icon"),o.classList.add("icon-expanded"),o.setAttribute("aria-hidden","true"),n.appendChild(o);var i=document.createElement("ul");i.role="menu",i.classList.add("h5p-interactive-book-summary-dropdown-menu");var s=e(this.l10n.allInteractions,this.filterActionAll),c=e(this.l10n.unansweredInteractions,this.filterActionUnanswered);return i.appendChild(s),i.appendChild(c),r.appendChild(n),r.appendChild(i),r}},{key:"addSummaryOverview",value:function(){var t=document.createElement("ul");t.classList.add("h5p-interactive-book-summary-list");var e=document.createElement("li");e.classList.add("h5p-interactive-book-summary-overview-header");var r=document.createElement("h3");r.innerHTML=this.l10n.summaryHeader,e.appendChild(r),e.appendChild(this.createFilterDropdown()),t.appendChild(e);var n=document.createElement("ol");n.classList.add("h5p-interactive-book-summary-overview-list");var a,o=I(this.chapters);try{for(o.s();!(a=o.n()).done;){var i=a.value;n.appendChild(this.createChapterOverview(i))}}catch(t){o.e(t)}finally{o.f()}var s=document.createElement("p");s.classList.add("h5p-interactive-book-summary-overview-list-empty"),s.classList.add("h5p-interactive-book-summary-top-section"),s.classList.add("h5p-interactive-book-summary-bottom-section"),s.innerHTML=this.l10n.noInteractions,n.appendChild(s),t.appendChild(n),this.wrapper.appendChild(t)}},{key:"addScoreBar",value:function(){var t=document.createElement("div");t.classList.add("h5p-interactive-book-summary-score-bar");var e=H5P.JoubelUI.createScoreBar(this.parent.getMaxScore());e.setScore(this.parent.getScore()),e.appendTo(t),this.wrapper.appendChild(t)}},{key:"noChapterInteractions",value:function(){var t=document.createElement("div");t.classList.add("h5p-interactive-book-summary-no-chapter-interactions");var e=document.createElement("p");e.innerHTML=this.l10n.noChapterInteractionBoldText;var r=document.createElement("p");r.classList.add("h5p-interactive-book-summary-no-initialized-chapters"),r.innerHTML=this.l10n.noChapterInteractionText,t.appendChild(e),t.appendChild(r),this.wrapper.appendChild(t)}},{key:"addSummaryPage",value:function(t){if(this.wrapper=document.createElement("div"),this.wrapper.classList.add("h5p-interactive-book-summary-page"),this.chapters.filter((function(t){return t.isInitialized})).length>0||this.chapters.some((function(t){return t.sections.some((function(t){return t.taskDone}))}))){if(this.parent.pageContent&&this.parent.chapters[this.parent.getChapterId(this.parent.pageContent.targetPage.chapter)].isSummary||0===this.parent.chapters.length){if(this.parent.chapters.length>0)for(var e in this.chapters)this.parent.pageContent.initializeChapter(e);this.addProgressIndicators(),this.addActionButtons(),this.addSummaryOverview(),this.addScoreBar()}}else this.noChapterInteractions();return Array.from(document.querySelectorAll(".h5p-interactive-book-summary-footer")).forEach((function(t){return t.remove()})),t.append(this.wrapper),t}},{key:"checkTheAnswerIsUpdated",value:function(){var t,e=this.getChapterStats(),r=JSON.parse(this.tempState),n=I(e.keys());try{for(n.s();!(t=n.n()).done;){var a,o=t.value,i=r[o].state.instances,s=e[o].state.instances,c=e[o].sections,u=I(i.keys());try{for(u.s();!(a=u.n()).done;){var l=a.value;null!==i[l]&&void 0!==i[l]&&(Array.isArray(i[l])&&!this.compareStates(i[l],s[l])&&c[l].taskDone&&(this.parent.isAnswerUpdated=!0),"object"===j(i[l])&&!Array.isArray(i[l])&&JSON.stringify(i[l])!==JSON.stringify(s[l])&&c[l].taskDone&&(this.parent.isAnswerUpdated=!0))}}catch(t){u.e(t)}finally{u.f()}if(this.parent.isAnswerUpdated)break}}catch(t){n.e(t)}finally{n.f()}}},{key:"getChapterStats",value:function(){return this.chapters.filter((function(t){return!t.isSummary})).map((function(t){return{sections:t.sections.map((function(t){return{taskDone:t.taskDone}})),state:t.instance.getCurrentState()}}))}},{key:"compareStates",value:function(t,e){return Array.isArray(t)&&Array.isArray(e)&&t.length===e.length&&t.every((function(t,r){return t===e[r]||""===e[r]}))}}],r&&B(e.prototype,r),n&&B(e,n),Object.defineProperty(e,"prototype",{writable:!1}),o}();function _(t){return _="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},_(t)}function z(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),r.push.apply(r,n)}return r}function q(t){for(var e=1;e<arguments.length;e++){var r=null!=arguments[e]?arguments[e]:{};e%2?z(Object(r),!0).forEach((function(e){U(t,e,r[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):z(Object(r)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(r,e))}))}return t}function U(t,e,r){return e in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}function W(){return W=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var r=arguments[e];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(t[n]=r[n])}return t},W.apply(this,arguments)}function V(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}function $(t,e){return $=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t},$(t,e)}function G(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(t){return!1}}();return function(){var r,n=J(t);if(e){var a=J(this).constructor;r=Reflect.construct(n,arguments,a)}else r=n.apply(this,arguments);return X(this,r)}}function X(t,e){if(e&&("object"===_(e)||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t)}function J(t){return J=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},J(t)}const Y=function(t){!function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&$(t,e)}(i,H5P.EventDispatcher);var r,n,a,o=G(i);function i(t,e,r,n,a){var s;if(function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,i),(s=o.call(this)).parent=n,s.behaviour=t.behaviour,s.params=a,s.targetPage={},s.targetPage.redirectFromComponent=!1,s.columnNodes=[],s.chapters=[],s.l10n=t.l10n,s.sidebarIsOpen=!1,s.previousState=r.previousState&&Object.keys(r.previousState).length>0?r.previousState:null,n.hasValidChapters()){var c=s.createColumns(t,e,r);s.preloadChapter(c)}return s.content=s.createPageContent(),s.container=document.createElement("div"),s.container.classList.add("h5p-interactive-book-main","h5p-interactive-book-navigation-hidden"),s.container.appendChild(s.content),s}return r=i,n=[{key:"getChapters",value:function(){var t=!(arguments.length>0&&void 0!==arguments[0])||arguments[0];return this.chapters.filter((function(e){return!e.isSummary||e.isSummary&&!!t}))}},{key:"resetChapters",value:function(){this.behaviour.progressIndicators&&!this.behaviour.progressAuto&&this.columnNodes.forEach((function(t){Array.from(t.querySelectorAll(".h5p-interactive-book-status-progress-marker > input[type=checkbox]")).forEach((function(t){return t.checked=!1}))}))}},{key:"createPageContent",value:function(){var t=document.createElement("div");return t.classList.add("h5p-interactive-book-content"),this.columnNodes.forEach((function(e){t.appendChild(e)})),this.setChapterOrder(this.parent.getActiveChapter()),t}},{key:"setChapterOrder",value:function(t){t<0||t>this.columnNodes.length-1||this.columnNodes.forEach((function(e,r){e.classList.remove("h5p-interactive-book-previous"),e.classList.remove("h5p-interactive-book-current"),e.classList.remove("h5p-interactive-book-next"),r===t-1||r===t&&e.classList.add("h5p-interactive-book-current")}))}},{key:"createChapterReadCheckbox",value:function(t){var e=this,r=document.createElement("input");r.setAttribute("type","checkbox"),r.checked=t,r.onclick=function(t){e.parent.setChapterRead(void 0,t.target.checked)};var n=document.createElement("p");n.innerHTML=this.params.l10n.markAsFinished;var a=document.createElement("label");return a.classList.add("h5p-interactive-book-status-progress-marker"),a.appendChild(r),a.appendChild(n),a}},{key:"injectSectionId",value:function(t,e){for(var r=e.getElementsByClassName("h5p-column-content"),n=0;n<t.length;n++)r[n].id="h5p-interactive-book-section-".concat(t[n].instance.subContentId)}},{key:"preloadChapter",value:function(t){this.initializeChapter(t),this.initializeChapter(t+1)}},{key:"initializeChapter",value:function(t){if(!(t<0||t>this.chapters.length-1)){var e=this.chapters[t];if(e.isSummary){var r=this.columnNodes[t];return e.isInitialized&&(e.instance.setChapters(this.getChapters(!1)),r.innerHTML=""),e.instance.addSummaryPage(H5P.jQuery(r)),void(e.isInitialized=!0)}if(!e.isInitialized){var n=this.columnNodes[t];if(e.instance.attach(H5P.jQuery(n)),this.injectSectionId(e.sections,n),this.behaviour.progressIndicators&&!this.behaviour.progressAuto){var a=!!this.previousState&&this.previousState.chapters[t].completed;n.appendChild(this.createChapterReadCheckbox(a))}e.isInitialized=!0}}}},{key:"createColumns",value:function(t,r,n){var a=this,o=(n=W({},n)).previousState&&Object.keys(n.previousState).length>0?n.previousState:null,i=e.extractFragmentsFromURL(this.parent.validateFragments,this.parent.hashWindow);0===Object.keys(i).length&&n&&o&&o.urlFragments&&(i=o.urlFragments);var s=[];this.chapters=s;for(var c=function(e){var i=document.createElement("div"),c=q(q({},n),{},{metadata:q({},n.metadata),previousState:o?o.chapters[e].state:{}}),u=H5P.newRunnable(t.chapters[e],r,void 0,void 0,c);a.parent.bubbleUp(u,"resize",a.parent);var l={isInitialized:!1,instance:u,title:t.chapters[e].metadata.title,completed:!!o&&o.chapters[e].completed,tasksLeft:o?o.chapters[e].tasksLeft:0,isSummary:!1,sections:u.getInstances().map((function(r,n){return{content:t.chapters[e].params.content[n].content,instance:r,isTask:!1}}))};i.classList.add("h5p-interactive-book-chapter"),i.id="h5p-interactive-book-chapter-".concat(u.subContentId),l.maxTasks=0,l.tasksLeft=0,l.sections.forEach((function(t,r){H5P.Column.isTask(t.instance)&&(t.isTask=!0,l.maxTasks++,l.tasksLeft++,a.behaviour.progressIndicators&&(t.taskDone=!!o&&o.chapters[e].sections[r].taskDone,t.taskDone&&l.tasksLeft--))})),s.push(l),a.columnNodes.push(i)},u=0;u<t.chapters.length;u++)c(u);if(this.parent.hasSummary(s)){var l=document.createElement("div"),p=new H(q({},t),this.parent,this.getChapters(!1));this.parent.bubbleUp(p,"resize",this.parent);var h={isInitialized:!1,instance:p,title:this.l10n.summaryHeader,isSummary:!0,sections:[]};l.classList.add("h5p-interactive-book-chapter"),l.id="h5p-interactive-book-chapter-summary",h.maxTasks=h.tasksLeft,s.push(h),this.columnNodes.push(l)}if(i.chapter&&i.h5pbookid==this.parent.contentId){var d=this.findChapterIndex(i.chapter);this.parent.setActiveChapter(d);var f=i.headerNumber;return i.section&&setTimeout((function(){a.redirectSection(i.section,f),a.parent.hasCover()&&a.parent.cover.removeCover()}),1e3),d}return 0}},{key:"redirectSection",value:function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null;if("top"===t)this.parent.trigger("scrollToTop");else{var r=document.getElementById(t);if(r){if(null!==e){var n=r.querySelectorAll("h2, h3");n[e]&&(r=n[e])}var a=document.createElement("div");a.setAttribute("tabindex","-1"),r.parentNode.insertBefore(a,r),a.focus(),a.addEventListener("blur",(function(){a.parentNode.removeChild(a)})),this.targetPage.redirectFromComponent=!1,setTimeout((function(){r.scrollIntoView(!0)}),100)}}}},{key:"findChapterIndex",value:function(t){var e=-1;return this.columnNodes.forEach((function(r,n){-1===e&&r.id===t&&(e=n)})),-1===e?0:e}},{key:"changeChapter",value:function(t,e){var r=this;if(!this.columnNodes[this.parent.getActiveChapter()].classList.contains("h5p-interactive-book-animate")){this.targetPage=e;var n=this.parent.getActiveChapter(),a=this.parent.getChapterId(this.targetPage.chapter),o=n!==a;if(t||this.parent.updateChapterProgress(n,o),this.preloadChapter(a),a<this.columnNodes.length){var i=this.columnNodes[n],s=this.columnNodes[a];if(o&&!t){this.parent.setActiveChapter(a);var c=n<a?"next":"previous";s.classList.add("h5p-interactive-book-".concat(c)),s.classList.add("h5p-interactive-book-animate"),i.classList.add("h5p-interactive-book-animate"),setTimeout((function(){"previous"===c?i.classList.add("h5p-interactive-book-next"):(i.classList.remove("h5p-interactive-book-current"),i.classList.add("h5p-interactive-book-previous")),s.classList.remove("h5p-interactive-book-".concat(c))}),1),setTimeout((function(){i.classList.remove("h5p-interactive-book-next"),i.classList.remove("h5p-interactive-book-previous"),i.classList.remove("h5p-interactive-book-current"),s.classList.add("h5p-interactive-book-current"),s.classList.remove("h5p-interactive-book-animate"),i.classList.remove("h5p-interactive-book-animate"),r.redirectSection(r.targetPage.section,r.targetPage.headerNumber),r.parent.trigger("resize")}),250)}else this.parent.cover&&!this.parent.cover.hidden?this.parent.on("coverRemoved",(function(){r.redirectSection(r.targetPage.section,r.targetPage.headerNumber)})):this.redirectSection(this.targetPage.section,this.targetPage.headerNumber);this.parent.sideBar.redirectHandler(a)}}}},{key:"updateFooter",value:function(){if(0!==this.chapters.length){var t=this.parent.getActiveChapter(),e=this.columnNodes[t],r=this.parent.shouldFooterBeHidden(e.clientHeight),n=this.parent.statusBarFooter.wrapper.parentNode;r?n!==this.content&&this.content.appendChild(this.parent.statusBarFooter.wrapper):n!==this.parent.$wrapper&&this.parent.$wrapper.append(this.parent.statusBarFooter.wrapper)}}},{key:"toggleNavigationMenu",value:function(){var t=this;this.sidebarIsOpen?(H5P.Transition.onTransitionEnd(H5P.jQuery(this.container),(function(){t.container.classList.add("h5p-interactive-book-navigation-hidden")}),500),this.container.classList.remove("h5p-interactive-book-navigation-open")):(this.container.classList.remove("h5p-interactive-book-navigation-hidden"),setTimeout((function(){t.container.classList.add("h5p-interactive-book-navigation-open")}),1)),this.sidebarIsOpen=!this.sidebarIsOpen}}],n&&V(r.prototype,n),a&&V(r,a),Object.defineProperty(r,"prototype",{writable:!1}),i}();r(2062);function K(t){return K="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},K(t)}var Q=["read","displayTOC","hideTOC","nextPage","previousPage","chapterCompleted","partCompleted","incompleteChapter","navigateToTop","markAsFinished","fullscreen","exitFullscreen","bookProgressSubtext","interactionsProgressSubtext","submitReport","restartLabel","summaryHeader","allInteractions","unansweredInteractions","scoreText","leftOutOfTotalCompleted","noInteractions","score","summaryAndSubmit","noChapterInteractionBoldText","noChapterInteractionText","yourAnswersAreSubmittedForReview","bookProgress","interactionsProgress","totalScoreLabel"];function Z(t,e){if(null==t)return{};var r,n,a=function(t,e){if(null==t)return{};var r,n,a={},o=Object.keys(t);for(n=0;n<o.length;n++)r=o[n],e.indexOf(r)>=0||(a[r]=t[r]);return a}(t,e);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(t);for(n=0;n<o.length;n++)r=o[n],e.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(t,r)&&(a[r]=t[r])}return a}function tt(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),r.push.apply(r,n)}return r}function et(t){for(var e=1;e<arguments.length;e++){var r=null!=arguments[e]?arguments[e]:{};e%2?tt(Object(r),!0).forEach((function(e){rt(t,e,r[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):tt(Object(r)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(r,e))}))}return t}function rt(t,e,r){return e in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}function nt(){return nt=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var r=arguments[e];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(t[n]=r[n])}return t},nt.apply(this,arguments)}function at(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function ot(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}function it(t,e){return it=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t},it(t,e)}function st(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(t){return!1}}();return function(){var r,n=lt(t);if(e){var a=lt(this).constructor;r=Reflect.construct(n,arguments,a)}else r=n.apply(this,arguments);return ct(this,r)}}function ct(t,e){if(e&&("object"===K(e)||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return ut(t)}function ut(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}function lt(t){return lt=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},lt(t)}var pt=function(t){!function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&it(t,e)}(i,H5P.EventDispatcher);var r,n,a,o=st(i);function i(t,r){var n,a=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};at(this,i);var s=ut(n=o.call(this));if(n.contentId=r,n.previousState=a.previousState,t&&t.behaviour&&t.behaviour.baseColor&&!T.isBaseColor(t.behaviour.baseColor)){T.setBase(t.behaviour.baseColor);var c=document.createElement("style");c.styleSheet?c.styleSheet.cssText=T.getCSS():c.appendChild(document.createTextNode(T.getCSS())),document.head.appendChild(c)}n.activeChapter=0,n.newHandler={},n.completed=!1,n.params=i.sanitizeConfig(t),n.l10n=n.params.l10n,n.params.behaviour=n.params.behaviour||{},n.mainWrapper=null,n.currentRatio=null,n.smallSurface="h5p-interactive-book-small",n.mediumSurface="h5p-interactive-book-medium",n.largeSurface="h5p-interactive-book-large",n.chapters=[],n.isSubmitButtonEnabled=!1,n.isAnswerUpdated=!0,void 0!==a.isScoringEnabled||void 0!==a.isReportingEnabled?n.isSubmitButtonEnabled=a.isScoringEnabled||a.isReportingEnabled:void 0!==H5PIntegration.reportingIsEnabled&&(n.isSubmitButtonEnabled=H5PIntegration.reportingIsEnabled),n.params.behaviour.enableSolutionsButton=!1,n.params.behaviour.enableRetry=!1,n.getAnswerGiven=function(){return n.chapters.reduce((function(t,e){return"function"==typeof e.instance.getAnswerGiven?t&&e.instance.getAnswerGiven():t}),!0)},n.getScore=function(){return n.chapters.length>0?n.chapters.reduce((function(t,e){return"function"==typeof e.instance.getScore?t+e.instance.getScore():t}),0):n.previousState&&n.previousState.score||0},n.getMaxScore=function(){return n.chapters.length>0?n.chapters.reduce((function(t,e){return"function"==typeof e.instance.getMaxScore?t+e.instance.getMaxScore():t}),0):n.previousState&&n.previousState.maxScore||0},n.showSolutions=function(){n.chapters.forEach((function(t){"function"==typeof t.instance.toggleReadSpeaker&&t.instance.toggleReadSpeaker(!0),"function"==typeof t.instance.showSolutions&&t.instance.showSolutions(),"function"==typeof t.instance.toggleReadSpeaker&&t.instance.toggleReadSpeaker(!1)}))},n.resetTask=function(){n.hasValidChapters()&&(n.chapters.forEach((function(t,e){t.isInitialized&&!t.isSummary&&("function"==typeof t.instance.resetTask&&t.instance.resetTask(),t.tasksLeft=t.maxTasks,t.sections.forEach((function(t){return t.taskDone=!1})),n.setChapterRead(e,!1))})),n.setActivityStarted(!0),n.pageContent.resetChapters(),n.sideBar.resetIndicators(),n.trigger("newChapter",{h5pbookid:n.contentId,chapter:n.pageContent.columnNodes[0].id,section:"top"}),n.hasCover()&&n.displayCover(n.mainWrapper),n.isAnswerUpdated=!1)},n.getXAPIData=function(){var t=n.createXAPIEventTemplate("answered");return n.addQuestionToXAPI(t),t.setScoredResult(n.getScore(),n.getMaxScore(),ut(n),!0,n.getScore()===n.getMaxScore()),{statement:t.data.statement,children:n.getXAPIDataFromChildren(n.chapters.map((function(t){return t.instance})))}},n.getXAPIDataFromChildren=function(t){return t.map((function(t){if("function"==typeof t.getXAPIData)return t.getXAPIData()})).filter((function(t){return!!t}))},n.addQuestionToXAPI=function(t){nt(t.getVerifiedStatementValue(["object","definition"]),n.getxAPIDefinition())},n.getxAPIDefinition=function(){return{interactionType:"compound",type:"http://adlnet.gov/expapi/activities/cmi.interaction",description:{"en-US":""}}},n.getCurrentState=function(){var t=n.chapters.filter((function(t){return!t.isSummary})).map((function(t){return{completed:t.completed,sections:t.sections.map((function(t){return{taskDone:t.taskDone}})),state:t.instance.getCurrentState()}}));return{urlFragments:e.extractFragmentsFromURL(n.validateFragments,n.hashWindow),chapters:t,score:n.getScore(),maxScore:n.getMaxScore()}},n.getContext=function(){return n.cover&&!n.cover.hidden?{}:{type:"page",value:n.activeChapter+1}},n.hasCover=function(){return n.cover&&n.cover.container},n.hasSummary=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:n.chapters;return n.hasChaptersTasks(t)&&n.params.behaviour.displaySummary&&!0===n.params.behaviour.displaySummary},n.hasChaptersTasks=function(t){return t.filter((function(t){return t.sections.filter((function(t){return!0===t.isTask})).length>0})).length>0},n.hasValidChapters=function(){return n.params.chapters.length>0},n.getActiveChapter=function(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0];return t?n.chapters[n.activeChapter]:n.activeChapter},n.setActiveChapter=function(t){t=parseInt(t),isNaN(t)||(n.activeChapter=t)},n.validateFragments=function(t){return void 0!==t.chapter&&String(t.h5pbookid)===String(s.contentId)},n.bubbleUp=function(t,e,r){t.on(e,(function(t){r.bubblingUpwards=!0,r.trigger(e,t),r.bubblingUpwards=!1}))},n.isMenuOpen=function(){return n.statusBarHeader.isMenuOpen()},n.isSmallSurface=function(){return n.mainWrapper&&n.mainWrapper.hasClass(n.smallSurface)},n.getRatio=function(){return n.mainWrapper.width()/parseFloat(n.mainWrapper.css("font-size"))},n.setWrapperClassFromRatio=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:n.getRatio();e!==n.currentRatio&&(n.breakpoints().forEach((function(t){t.shouldAdd(e)?n.mainWrapper.addClass(t.className):n.mainWrapper.removeClass(t.className)})),n.currentRatio=e)},n.resize=function(){if(n.pageContent&&n.hasValidChapters()&&n.mainWrapper){n.setWrapperClassFromRatio(n.mainWrapper);var t=n.getActiveChapter(),e=n.pageContent.columnNodes[t];null!==e.offsetParent&&(n.bubblingUpwards||n.pageContent.chapters[t].instance.trigger("resize"),n.pageContent.content.style.height==="".concat(e.offsetHeight,"px")||e.classList.contains("h5p-interactive-book-animate")||(n.pageContent.content.style.height="".concat(e.offsetHeight,"px"),n.pageContent.updateFooter(),setTimeout((function(){n.trigger("resize")}),10)))}},n.on("resize",n.resize,ut(n)),n.on("toggleMenu",(function(){n.pageContent.toggleNavigationMenu(),n.statusBarHeader.menuToggleButton.setAttribute("aria-expanded",n.statusBarHeader.menuToggleButton.classList.toggle("h5p-interactive-book-status-menu-active")?"true":"false"),n.pageContent.sidebarIsOpen&&n.sideBar.focus(),setTimeout((function(){n.trigger("resize")}),150)})),n.on("scrollToTop",(function(){if(!0===H5P.isFullscreen){var t=n.pageContent.container;t.scrollBy(0,-t.scrollHeight)}else n.statusBarHeader.wrapper.scrollIntoView(!0)})),n.on("newChapter",(function(t){if(!n.pageContent.columnNodes[n.getActiveChapter()].classList.contains("h5p-interactive-book-animate")){if(n.newHandler=t.data,t.data.newHash=e.createFragmentsString(n.newHandler),n.newHandler.redirectFromComponent=!0,n.getChapterId(t.data.chapter)===n.activeChapter)if(e.areFragmentsEqual(t.data,e.extractFragmentsFromURL(n.validateFragments,n.hashWindow),["h5pbookid","chapter","section","headerNumber"]))return void n.pageContent.changeChapter(!1,t.data);if(n.params.behaviour.progressAuto){var r=n.getChapterId(n.newHandler.chapter);n.isFinalChapterWithoutTask(r)&&n.setChapterRead(r)}H5P.trigger(ut(n),"changeHash",t.data),H5P.trigger(ut(n),"scrollToTop")}})),n.isCurrentChapterRead=function(){return n.isChapterRead(n.chapters[n.activeChapter],n.params.behaviour.progressAuto)},n.isChapterRead=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:n.params.behaviour.progressAuto;return t.completed||e&&0===t.tasksLeft},n.isFinalChapterWithoutTask=function(t){return 0===n.chapters[t].maxTasks&&n.chapters.slice(0,t).concat(n.chapters.slice(t+1)).every((function(t){return 0===t.tasksLeft}))},n.setChapterRead=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:n.activeChapter,e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1];n.handleChapterCompletion(t,e),n.sideBar.updateChapterProgressIndicator(t,e?"DONE":n.hasChapterStartedTasks(n.chapters[t])?"STARTED":"BLANK")},n.hasChapterStartedTasks=function(t){return t.sections.filter((function(t){return t.taskDone})).length>0},n.getChapterStatus=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:n.params.behaviour.progressAuto,r="BLANK";return n.isChapterRead(t,e)?r="DONE":n.hasChapterStartedTasks(t)&&(r="STARTED"),r},n.updateChapterProgress=function(t){var e=arguments.length>1&&void 0!==arguments[1]&&arguments[1];if(n.params.behaviour.progressIndicators){var r,a=n.chapters[t];"DONE"===(r=a.maxTasks?n.getChapterStatus(a):n.isChapterRead(a)&&e?"DONE":"BLANK")&&n.handleChapterCompletion(t),n.sideBar.updateChapterProgressIndicator(t,r)}},n.getChapterId=function(t){t=t.replace("h5p-interactive-book-chapter-","");var e=n.chapters.map((function(t){return t.instance.subContentId})).indexOf(t);return-1===e?0:e},n.handleChapterCompletion=function(t){var e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],r=n.chapters[t];if(!0!==r.isSummary){if(!e)return r.completed=!1,n.completed=!1,void n.trigger("bookCompleted",{completed:n.completed});r.completed||(r.completed=!0,r.instance.triggerXAPIScored(r.instance.getScore(),r.instance.getMaxScore(),"completed")),!n.completed&&n.chapters.filter((function(t){return!t.isSummary})).every((function(t){return t.completed}))&&(n.completed=!0,n.trigger("bookCompleted",{completed:n.completed}))}},n.shouldFooterBeHidden=function(){return n.isFullscreen},n.getContainerWidth=function(){return n.pageContent&&n.pageContent.container?n.pageContent.container.offsetWidth:0},n.changeChapter=function(t){n.pageContent.changeChapter(t,n.newHandler),n.statusBarHeader.updateStatusBar(),n.statusBarFooter.updateStatusBar(),n.newHandler.redirectFromComponent=!1},n.breakpoints=function(){return[{className:n.smallSurface,shouldAdd:function(t){return t<43}},{className:n.mediumSurface,shouldAdd:function(t){return t>=43&&t<60}},{className:n.largeSurface,shouldAdd:function(t){return t>=60}}]},H5P.on(ut(n),"respondChangeHash",(function(){var t=e.extractFragmentsFromURL(s.validateFragments,n.hashWindow);t.h5pbookid&&String(t.h5pbookid)===String(s.contentId)&&n.redirectChapter(t)})),H5P.on(ut(n),"changeHash",(function(t){String(t.data.h5pbookid)===String(n.contentId)&&(n.hashWindow.location.hash=t.data.newHash)})),H5P.externalDispatcher.on("xAPI",(function(t){var e=["answered","completed","interacted","attempted"].indexOf(t.getVerb())>-1,r=s.chapters.length;s!==this&&e&&r&&s.setSectionStatusByID(this.subContentId||this.contentData.subContentId,s.activeChapter)})),n.redirectChapter=function(t){n.newHandler.redirectFromComponent||(t.h5pbookid&&String(t.h5pbookid)===String(s.contentId)?s.newHandler=t:s.newHandler={chapter:"h5p-interactive-book-chapter-".concat(s.chapters[0].instance.subContentId),h5pbookid:s.h5pbookid}),s.changeChapter(!1)},n.setSectionStatusByID=function(t,e){n.chapters[e].sections.forEach((function(r,a){var o=r.instance;o.subContentId!==t||r.taskDone||(r.taskDone=!o.getAnswerGiven||o.getAnswerGiven(),n.sideBar.setSectionMarker(e,a),r.taskDone&&(n.chapters[e].tasksLeft-=1),n.updateChapterProgress(e))}))},n.addHashListener=function(t){t.addEventListener("hashchange",(function(t){H5P.trigger(ut(n),"respondChangeHash",t)})),n.hashWindow=t};try{n.addHashListener(top)}catch(t){if(!(t instanceof DOMException))throw t;n.addHashListener(window)}n.displayCover=function(t){n.hideAllElements(!0),t.append(n.cover.container),t.addClass("covered"),n.cover.initMedia()},n.attach=function(t){n.mainWrapper=t,t.addClass("h5p-interactive-book h5p-scrollable-fullscreen"),n.isEdge18orEarlier()&&t.addClass("edge-18"),n.setWrapperClassFromRatio(n.mainWrapper),n.cover&&n.displayCover(t),t.append(n.statusBarHeader.wrapper);var e=n.pageContent.container.firstChild;e&&n.pageContent.container.insertBefore(n.sideBar.container,e),t.append(n.pageContent.container),t.append(n.statusBarFooter.wrapper),n.$wrapper=t,n.params.behaviour.defaultTableOfContents&&!n.isSmallSurface()&&n.trigger("toggleMenu"),n.pageContent.updateFooter()},n.isEdge18orEarlier=function(){var t=window.navigator.userAgent,e=t.indexOf("Edge/");if(e<0)return!1;var r=t.substring(e+5,t.indexOf(".",e));return parseInt(r)<=18},n.hideAllElements=function(t){var e=[this.statusBarHeader.wrapper,this.statusBarFooter.wrapper,this.pageContent.container];t?e.forEach((function(t){t.classList.add("h5p-content-hidden"),t.classList.add("h5p-interactive-book-cover-present")})):e.forEach((function(t){t.classList.remove("h5p-content-hidden"),t.classList.remove("h5p-interactive-book-cover-present")}))},n.params.showCoverPage&&(n.cover=new E(n.params.bookCover,a.metadata.title,n.l10n.read,r,ut(n)));var u=et(et({},a),{},{parent:ut(n)});return n.pageContent=new Y(n.params,r,u,ut(n),{l10n:{markAsFinished:n.l10n.markAsFinished},behaviour:n.params.behaviour}),n.chapters=n.pageContent.getChapters(),n.sideBar=new p(n.params,r,a.metadata.title,ut(n)),n.chapters.forEach((function(t,e){n.setChapterRead(e,t.completed)})),n.statusBarHeader=new y(r,n.chapters.length,ut(n),{l10n:n.l10n,a11y:n.params.a11y,behaviour:n.params.behaviour,displayFullScreenButton:!0,displayMenuToggleButton:!0},"h5p-interactive-book-status-header"),n.statusBarFooter=new y(r,n.chapters.length,ut(n),{l10n:n.l10n,a11y:n.params.a11y,behaviour:n.params.behaviour,displayToTopButton:!0},"h5p-interactive-book-status-footer"),n.hasCover()?(n.hideAllElements(!0),n.on("coverRemoved",(function(){n.hideAllElements(!1),n.trigger("resize"),n.setActivityStarted(),n.statusBarHeader.progressBar.progress.focus()}))):n.setActivityStarted(),n.hasValidChapters()&&(n.statusBarHeader.updateStatusBar(),n.statusBarFooter.updateStatusBar()),n}return r=i,a=[{key:"sanitizeConfig",value:function(t){var e=t.read,r=void 0===e?"Read":e,n=t.displayTOC,a=void 0===n?"Display &#039;Table of contents&#039;":n,o=t.hideTOC,i=void 0===o?"Hide &#039;Table of contents&#039;":o,s=t.nextPage,c=void 0===s?"Next page":s,u=t.previousPage,l=void 0===u?"Previous page":u,p=t.chapterCompleted,h=void 0===p?"Page completed!":p,d=t.partCompleted,f=void 0===d?"@pages of @total completed":d,v=t.incompleteChapter,m=void 0===v?"Incomplete page":v,b=t.navigateToTop,g=void 0===b?"Navigate to the top":b,y=t.markAsFinished,k=void 0===y?"I have finished this page":y,w=t.fullscreen,C=void 0===w?"Fullscreen":w,S=t.exitFullscreen,x=void 0===S?"Exit fullscreen":S,O=t.bookProgressSubtext,E=void 0===O?"@count of @total pages":O,L=t.interactionsProgressSubtext,P=void 0===L?"@count of @total interactions":L,A=t.submitReport,T=void 0===A?"Submit Report":A,j=t.restartLabel,I=void 0===j?"Restart":j,M=t.summaryHeader,B=void 0===M?"Summary":M,F=t.allInteractions,R=void 0===F?"All interactions":F,N=t.unansweredInteractions,D=void 0===N?"Unanswered interactions":N,H=t.scoreText,_=void 0===H?"@score / @maxscore":H,z=t.leftOutOfTotalCompleted,q=void 0===z?"@left of @max interactinos completed":z,U=t.noInteractions,W=void 0===U?"No interactions":U,V=t.score,$=void 0===V?"Score":V,G=t.summaryAndSubmit,X=void 0===G?"Summary & submit":G,J=t.noChapterInteractionBoldText,Y=void 0===J?"You have not interacted with any pages.":J,K=t.noChapterInteractionText,tt=void 0===K?"You have to interact with at least one page before you can see the summary.":K,et=t.yourAnswersAreSubmittedForReview,rt=void 0===et?"Your answers are submitted for review!":et,nt=t.bookProgress,at=void 0===nt?"Book progress":nt,ot=t.interactionsProgress,it=void 0===ot?"Interactions progress":ot,st=t.totalScoreLabel,ct=void 0===st?"Total score":st,ut=Z(t,Q);return ut.chapters=ut.chapters.map((function(t){return t.params.content=t.params.content.filter((function(t){return t.content})),t})).filter((function(t){return t.params.content&&t.params.content.length>0})),ut.behaviour.displaySummary=void 0===ut.behaviour.displaySummary||ut.behaviour.displaySummary,ut.l10n={read:r,displayTOC:a,hideTOC:i,nextPage:c,previousPage:l,chapterCompleted:h,partCompleted:f,incompleteChapter:m,navigateToTop:g,markAsFinished:k,fullscreen:C,exitFullscreen:x,bookProgressSubtext:E,interactionsProgressSubtext:P,submitReport:T,restartLabel:I,summaryHeader:B,allInteractions:R,unansweredInteractions:D,scoreText:_,leftOutOfTotalCompleted:q,noInteractions:W,score:$,summaryAndSubmit:X,noChapterInteractionBoldText:Y,noChapterInteractionText:tt,yourAnswersAreSubmittedForReview:rt,bookProgress:at,interactionsProgress:it,totalScoreLabel:ct},ut}}],(n=null)&&ot(r.prototype,n),a&&ot(r,a),Object.defineProperty(r,"prototype",{writable:!1}),i}();H5P=H5P||{},H5P.InteractiveBook=pt})()})();;// Will render a Question with multiple choices for answers.

// Options format:
// {
//   title: "Optional title for question box",
//   question: "Question text",
//   answers: [{text: "Answer text", correct: false}, ...],
//   singleAnswer: true, // or false, will change rendered output slightly.
//   singlePoint: true,  // True if question give a single point score only
//                       // if all are correct, false to give 1 point per
//                       // correct answer. (Only for singleAnswer=false)
//   randomAnswers: false  // Whether to randomize the order of answers.
// }
//
// Events provided:
// - h5pQuestionAnswered: Triggered when a question has been answered.

var H5P = H5P || {};

/**
 * @typedef {Object} Options
 *   Options for multiple choice
 *
 * @property {Object} behaviour
 * @property {boolean} behaviour.confirmCheckDialog
 * @property {boolean} behaviour.confirmRetryDialog
 *
 * @property {Object} UI
 * @property {string} UI.tipsLabel
 *
 * @property {Object} [confirmRetry]
 * @property {string} [confirmRetry.header]
 * @property {string} [confirmRetry.body]
 * @property {string} [confirmRetry.cancelLabel]
 * @property {string} [confirmRetry.confirmLabel]
 *
 * @property {Object} [confirmCheck]
 * @property {string} [confirmCheck.header]
 * @property {string} [confirmCheck.body]
 * @property {string} [confirmCheck.cancelLabel]
 * @property {string} [confirmCheck.confirmLabel]
 */

/**
 * Module for creating a multiple choice question
 *
 * @param {Options} options
 * @param {number} contentId
 * @param {Object} contentData
 * @returns {H5P.MultiChoice}
 * @constructor
 */
H5P.MultiChoice = function (options, contentId, contentData) {
  if (!(this instanceof H5P.MultiChoice))
    return new H5P.MultiChoice(options, contentId, contentData);
  var self = this;
  this.contentId = contentId;
  this.contentData = contentData;
  H5P.Question.call(self, 'multichoice');
  var $ = H5P.jQuery;

  var defaults = {
    image: null,
    question: "No question text provided",
    answers: [
      {
        tipsAndFeedback: {
          tip: '',
          chosenFeedback: '',
          notChosenFeedback: ''
        },
        text: "Answer 1",
        correct: true
      }
    ],
    overallFeedback: [],
    weight: 1,
    userAnswers: [],
    UI: {
      checkAnswerButton: 'Check',
      submitAnswerButton: 'Submit',
      showSolutionButton: 'Show solution',
      tryAgainButton: 'Try again',
      scoreBarLabel: 'You got :num out of :total points',
      tipAvailable: "Tip available",
      feedbackAvailable: "Feedback available",
      readFeedback: 'Read feedback',
      shouldCheck: "Should have been checked",
      shouldNotCheck: "Should not have been checked",
      noInput: 'Input is required before viewing the solution',
      a11yCheck: 'Check the answers. The responses will be marked as correct, incorrect, or unanswered.',
      a11yShowSolution: 'Show the solution. The task will be marked with its correct solution.',
      a11yRetry: 'Retry the task. Reset all responses and start the task over again.',
    },
    behaviour: {
      enableRetry: true,
      enableSolutionsButton: true,
      enableCheckButton: true,
      type: 'auto',
      singlePoint: true,
      randomAnswers: false,
      showSolutionsRequiresInput: true,
      autoCheck: false,
      passPercentage: 100,
      showScorePoints: true
    }
  };
  var params = $.extend(true, defaults, options);
  // Keep track of number of correct choices
  var numCorrect = 0;

  // Loop through choices
  for (var i = 0; i < params.answers.length; i++) {
    var answer = params.answers[i];

    // Make sure tips and feedback exists
    answer.tipsAndFeedback = answer.tipsAndFeedback || {};

    if (params.answers[i].correct) {
      // Update number of correct choices
      numCorrect++;
    }
  }

  // Determine if no choices is the correct
  var blankIsCorrect = (numCorrect === 0);

  // Determine task type
  if (params.behaviour.type === 'auto') {
    // Use single choice if only one choice is correct
    params.behaviour.singleAnswer = (numCorrect === 1);
  }
  else {
    params.behaviour.singleAnswer = (params.behaviour.type === 'single');
  }

  var getCheckboxOrRadioIcon = function (radio, selected) {
    var icon;
    if (radio) {
      icon = selected ? '&#xe603;' : '&#xe600;';
    }
    else {
      icon = selected ? '&#xe601;' : '&#xe602;';
    }
    return icon;
  };

  // Initialize buttons and elements.
  var $myDom;
  var $feedbackDialog;

  /**
   * Remove all feedback dialogs
   */
  var removeFeedbackDialog = function () {
    // Remove the open feedback dialogs.
    $myDom.unbind('click', removeFeedbackDialog);
    $myDom.find('.h5p-feedback-button, .h5p-feedback-dialog').remove();
    $myDom.find('.h5p-has-feedback').removeClass('h5p-has-feedback');
    if ($feedbackDialog) {
      $feedbackDialog.remove();
    }
  };

  var score = 0;
  var solutionsVisible = false;

  /**
   * Add feedback to element
   * @param {jQuery} $element Element that feedback will be added to
   * @param {string} feedback Feedback string
   */
  var addFeedback = function ($element, feedback) {
    $feedbackDialog = $('' +
    '<div class="h5p-feedback-dialog">' +
      '<div class="h5p-feedback-inner">' +
        '<div class="h5p-feedback-text">' + feedback + '</div>' +
      '</div>' +
    '</div>');

    //make sure feedback is only added once
    if (!$element.find($('.h5p-feedback-dialog')).length) {
      $feedbackDialog.appendTo($element.addClass('h5p-has-feedback'));
    }
  };

  /**
   * Register the different parts of the task with the H5P.Question structure.
   */
  self.registerDomElements = function () {
    var media = params.media;
    if (media && media.type && media.type.library) {
      media = media.type;
      var type = media.library.split(' ')[0];
      if (type === 'H5P.Image') {
        if (media.params.file) {
          // Register task image
          self.setImage(media.params.file.path, {
            disableImageZooming: params.media.disableImageZooming || false,
            alt: media.params.alt,
            title: media.params.title
          });
        }
      }
      else if (type === 'H5P.Video') {
        if (media.params.sources) {
          // Register task video
          self.setVideo(media);
        }
      }
      else if (type === 'H5P.Audio') {
        if (media.params.files) {
          // Register task audio
          self.setAudio(media);
        }
      }
    }

    // Determine if we're using checkboxes or radio buttons
    for (var i = 0; i < params.answers.length; i++) {
      params.answers[i].checkboxOrRadioIcon = getCheckboxOrRadioIcon(params.behaviour.singleAnswer, params.userAnswers.indexOf(i) > -1);
    }

    // Register Introduction
    self.setIntroduction('<div id="' + params.labelId + '">' + params.question + '</div>');

    // Register task content area
    $myDom = $('<ul>', {
      'class': 'h5p-answers',
      role: params.role,
      'aria-labelledby': params.labelId
    });

    for (let i = 0; i < params.answers.length; i++) {
      const answer = params.answers[i];
      answer.text = answer.text ?? '<div></div>';
      $('<li>', {
        'class': 'h5p-answer',
        role: answer.role,
        tabindex: answer.tabindex,
        'aria-checked': answer.checked,
        'data-id': i,
        html: '<div class="h5p-alternative-container"><span class="h5p-alternative-inner">' + answer.text + '</span></div>',
        appendTo: $myDom
      });
    }  
    
    self.setContent($myDom, {
      'class': params.behaviour.singleAnswer ? 'h5p-radio' : 'h5p-check'
    });

    // Create tips:
    var $answers = $('.h5p-answer', $myDom).each(function (i) {

      var tip = params.answers[i].tipsAndFeedback.tip;
      if (tip === undefined) {
        return; // No tip
      }

      tip = tip.trim();
      var tipContent = tip
        .replace(/&nbsp;/g, '')
        .replace(/<p>/g, '')
        .replace(/<\/p>/g, '')
        .trim();
      if (!tipContent.length) {
        return; // Empty tip
      }
      else {
        $(this).addClass('h5p-has-tip');
      }

      // Add tip
      var $wrap = $('<div/>', {
        'class': 'h5p-multichoice-tipwrap',
        'aria-label': params.UI.tipAvailable + '.'
      });

      var $multichoiceTip = $('<div>', {
        'role': 'button',
        'tabindex': 0,
        'title': params.UI.tipsLabel,
        'aria-label': params.UI.tipsLabel,
        'aria-expanded': false,
        'class': 'multichoice-tip',
        appendTo: $wrap
      });

      var tipIconHtml = '<span class="joubel-icon-tip-normal">' +
                          '<span class="h5p-icon-shadow"></span>' +
                          '<span class="h5p-icon-speech-bubble"></span>' +
                          '<span class="h5p-icon-info"></span>' +
                        '</span>';

      $multichoiceTip.append(tipIconHtml);

      $multichoiceTip.click(function () {
        var $tipContainer = $multichoiceTip.parents('.h5p-answer');
        var openFeedback = !$tipContainer.children('.h5p-feedback-dialog').is($feedbackDialog);
        removeFeedbackDialog();

        // Do not open feedback if it was open
        if (openFeedback) {
          $multichoiceTip.attr('aria-expanded', true);

          // Add tip dialog
          addFeedback($tipContainer, tip);
          $feedbackDialog.addClass('h5p-has-tip');

          // Tip for readspeaker
          self.read(tip);
        }
        else {
          $multichoiceTip.attr('aria-expanded', false);
        }

        self.trigger('resize');

        // Remove tip dialog on dom click
        setTimeout(function () {
          $myDom.click(removeFeedbackDialog);
        }, 100);

        // Do not propagate
        return false;
      }).keydown(function (e) {
        if (e.which === 32) {
          $(this).click();
          return false;
        }
      });

      $('.h5p-alternative-container', this).append($wrap);
    });

    // Set event listeners.
    var toggleCheck = function ($ans) {
      if ($ans.attr('aria-disabled') === 'true') {
        return;
      }
      self.answered = true;
      var num = parseInt($ans.data('id'));
      if (params.behaviour.singleAnswer) {
        // Store answer
        params.userAnswers = [num];

        // Calculate score
        score = (params.answers[num].correct ? 1 : 0);

        // De-select previous answer
        $answers.not($ans).removeClass('h5p-selected').attr('tabindex', '-1').attr('aria-checked', 'false');

        // Select new answer
        $ans.addClass('h5p-selected').attr('tabindex', '0').attr('aria-checked', 'true');
      }
      else {
        if ($ans.attr('aria-checked') === 'true') {
          const pos = params.userAnswers.indexOf(num);
          if (pos !== -1) {
            params.userAnswers.splice(pos, 1);
          }

          // Do not allow un-checking when retry disabled and auto check
          if (params.behaviour.autoCheck && !params.behaviour.enableRetry) {
            return;
          }

          // Remove check
          $ans.removeClass('h5p-selected').attr('aria-checked', 'false');
        }
        else {
          params.userAnswers.push(num);
          $ans.addClass('h5p-selected').attr('aria-checked', 'true');
        }

        // Calculate score
        calcScore();
      }

      self.triggerXAPI('interacted');
      hideSolution($ans);

      if (params.userAnswers.length) {
        self.showButton('check-answer');
        self.hideButton('try-again');
        self.hideButton('show-solution');

        if (params.behaviour.autoCheck) {
          if (params.behaviour.singleAnswer) {
            // Only a single answer allowed
            checkAnswer();
          }
          else {
            // Show feedback for selected alternatives
            self.showCheckSolution(true);

            // Always finish task if it was completed successfully
            if (score === self.getMaxScore()) {
              checkAnswer();
            }
          }
        }
      }
    };

    $answers.click(function () {
      toggleCheck($(this));
    }).keydown(function (e) {
      if (e.keyCode === 32) { // Space bar
        // Select current item
        toggleCheck($(this));
        return false;
      }

      if (params.behaviour.singleAnswer) {
        switch (e.keyCode) {
          case 38:   // Up
          case 37: { // Left
            // Try to select previous item
            var $prev = $(this).prev();
            if ($prev.length) {
              toggleCheck($prev.focus());
            }
            return false;
          }
          case 40:   // Down
          case 39: { // Right
            // Try to select next item
            var $next = $(this).next();
            if ($next.length) {
              toggleCheck($next.focus());
            }
            return false;
          }
        }
      }
    });

    if (params.behaviour.singleAnswer) {
      // Special focus handler for radio buttons
      $answers.focus(function () {
        if ($(this).attr('aria-disabled') !== 'true') {
          $answers.not(this).attr('tabindex', '-1');
        }
      }).blur(function () {
        if (!$answers.filter('.h5p-selected').length) {
          $answers.first().add($answers.last()).attr('tabindex', '0');
        }
      });
    }

    // Adds check and retry button
    addButtons();
    if (!params.behaviour.singleAnswer) {

      calcScore();
    }
    else {
      if (params.userAnswers.length && params.answers[params.userAnswers[0]].correct) {
        score = 1;
      }
      else {
        score = 0;
      }
    }

    // Has answered through auto-check in a previous session
    if (hasCheckedAnswer && params.behaviour.autoCheck) {

      // Check answers if answer has been given or max score reached
      if (params.behaviour.singleAnswer || score === self.getMaxScore()) {
        checkAnswer();
      }
      else {
        // Show feedback for checked checkboxes
        self.showCheckSolution(true);
      }
    }
  };

  this.showAllSolutions = function () {
    if (solutionsVisible) {
      return;
    }
    solutionsVisible = true;

    $myDom.find('.h5p-answer').each(function (i, e) {
      var $e = $(e);
      var a = params.answers[i];
      const className = 'h5p-solution-icon-' + (params.behaviour.singleAnswer ? 'radio' : 'checkbox');

      if (a.correct) {
        $e.addClass('h5p-should').append($('<span/>', {
          'class': className,
          html: params.UI.shouldCheck + '.'
        }));
      }
      else {
        $e.addClass('h5p-should-not').append($('<span/>', {
          'class': className,
          html: params.UI.shouldNotCheck + '.'
        }));
      }
    }).find('.h5p-question-plus-one, .h5p-question-minus-one').remove();

    // Make sure input is disabled in solution mode
    disableInput();

    // Move focus back to the first alternative so that the user becomes
    // aware that the solution is being shown.
    $myDom.find('.h5p-answer:first-child').focus();

    //Hide buttons and retry depending on settings.
    self.hideButton('check-answer');
    self.hideButton('show-solution');
    if (params.behaviour.enableRetry) {
      self.showButton('try-again');
    }
    self.trigger('resize');
  };

  /**
   * Used in contracts.
   * Shows the solution for the task and hides all buttons.
   */
  this.showSolutions = function () {
    removeFeedbackDialog();
    self.showCheckSolution();
    self.showAllSolutions();
    disableInput();
    self.hideButton('try-again');
  };

  /**
   * Hide solution for the given answer(s)
   *
   * @private
   * @param {H5P.jQuery} $answer
   */
  var hideSolution = function ($answer) {
    $answer
      .removeClass('h5p-correct')
      .removeClass('h5p-wrong')
      .removeClass('h5p-should')
      .removeClass('h5p-should-not')
      .removeClass('h5p-has-feedback')
      .find('.h5p-question-plus-one, ' +
        '.h5p-question-minus-one, ' +
        '.h5p-answer-icon, ' +
        '.h5p-solution-icon-radio, ' +
        '.h5p-solution-icon-checkbox, ' +
        '.h5p-feedback-dialog')
        .remove();
  };

  /**
   *
   */
  this.hideSolutions = function () {
    solutionsVisible = false;

    hideSolution($('.h5p-answer', $myDom));

    this.removeFeedback(); // Reset feedback

    self.trigger('resize');
  };

  /**
   * Resets the whole task.
   * Used in contracts with integrated content.
   * @private
   */
  this.resetTask = function () {
    self.answered = false;
    self.hideSolutions();
    params.userAnswers = [];
    removeSelections();
    self.showButton('check-answer');
    self.hideButton('try-again');
    self.hideButton('show-solution');
    enableInput();
    $myDom.find('.h5p-feedback-available').remove();
  };

  var calculateMaxScore = function () {
    if (blankIsCorrect) {
      return params.weight;
    }
    var maxScore = 0;
    for (var i = 0; i < params.answers.length; i++) {
      var choice = params.answers[i];
      if (choice.correct) {
        maxScore += (choice.weight !== undefined ? choice.weight : 1);
      }
    }
    return maxScore;
  };

  this.getMaxScore = function () {
    return (!params.behaviour.singleAnswer && !params.behaviour.singlePoint ? calculateMaxScore() : params.weight);
  };

  /**
   * Check answer
   */
  var checkAnswer = function () {
    // Unbind removal of feedback dialogs on click
    $myDom.unbind('click', removeFeedbackDialog);

    // Remove all tip dialogs
    removeFeedbackDialog();

    if (params.behaviour.enableSolutionsButton) {
      self.showButton('show-solution');
    }
    if (params.behaviour.enableRetry) {
      self.showButton('try-again');
    }
    self.hideButton('check-answer');

    self.showCheckSolution();
    disableInput();

    var xAPIEvent = self.createXAPIEventTemplate('answered');
    addQuestionToXAPI(xAPIEvent);
    addResponseToXAPI(xAPIEvent);
    self.trigger(xAPIEvent);
  };

  /**
   * Adds the ui buttons.
   * @private
   */
  var addButtons = function () {
    var $content = $('[data-content-id="' + self.contentId + '"].h5p-content');
    var $containerParents = $content.parents('.h5p-container');

    // select find container to attach dialogs to
    var $container;
    if($containerParents.length !== 0) {
      // use parent highest up if any
      $container = $containerParents.last();
    }
    else if($content.length !== 0){
      $container = $content;
    }
    else  {
      $container = $(document.body);
    }

    // Show solution button
    self.addButton('show-solution', params.UI.showSolutionButton, function () {
      if (params.behaviour.showSolutionsRequiresInput && !self.getAnswerGiven(true)) {
        // Require answer before solution can be viewed
        self.updateFeedbackContent(params.UI.noInput);
        self.read(params.UI.noInput);
      }
      else {
        calcScore();
        self.showAllSolutions();
      }

    }, false, {
      'aria-label': params.UI.a11yShowSolution,
    });

    // Check button
    if (params.behaviour.enableCheckButton && (!params.behaviour.autoCheck || !params.behaviour.singleAnswer)) {
      self.addButton('check-answer', params.UI.checkAnswerButton,
        function () {
          self.answered = true;
          checkAnswer();
          $myDom.find('.h5p-answer:first-child').focus();
        },
        true,
        {
          'aria-label': params.UI.a11yCheck,
        },
        {
          confirmationDialog: {
            enable: params.behaviour.confirmCheckDialog,
            l10n: params.confirmCheck,
            instance: self,
            $parentElement: $container
          },
          contentData: self.contentData,
          textIfSubmitting: params.UI.submitAnswerButton,
        }
      );
    }

    // Try Again button
    self.addButton('try-again', params.UI.tryAgainButton, function () {
      self.resetTask();

      if (params.behaviour.randomAnswers) {
        // reshuffle answers
       var oldIdMap = idMap;
       idMap = getShuffleMap();
       var answersDisplayed = $myDom.find('.h5p-answer');
       // remember tips
       var tip = [];
       for (i = 0; i < answersDisplayed.length; i++) {
         tip[i] = $(answersDisplayed[i]).find('.h5p-multichoice-tipwrap');
       }
       // Those two loops cannot be merged or you'll screw up your tips
       for (i = 0; i < answersDisplayed.length; i++) {
         // move tips and answers on display
         $(answersDisplayed[i]).find('.h5p-alternative-inner').html(params.answers[i].text);
         $(tip[i]).detach().appendTo($(answersDisplayed[idMap.indexOf(oldIdMap[i])]).find('.h5p-alternative-container'));
       }
     }
    }, false, {
      'aria-label': params.UI.a11yRetry,
    }, {
      confirmationDialog: {
        enable: params.behaviour.confirmRetryDialog,
        l10n: params.confirmRetry,
        instance: self,
        $parentElement: $container
      }
    });
  };

  /**
   * Determine which feedback text to display
   *
   * @param {number} score
   * @param {number} max
   * @return {string}
   */
  var getFeedbackText = function (score, max) {
    var ratio = (score / max);

    var feedback = H5P.Question.determineOverallFeedback(params.overallFeedback, ratio);

    return feedback.replace('@score', score).replace('@total', max);
  };

  /**
   * Shows feedback on the selected fields.
   * @public
   * @param {boolean} [skipFeedback] Skip showing feedback if true
   */
  this.showCheckSolution = function (skipFeedback) {
    var scorePoints;
    if (!(params.behaviour.singleAnswer || params.behaviour.singlePoint || !params.behaviour.showScorePoints)) {
      scorePoints = new H5P.Question.ScorePoints();
    }

    $myDom.find('.h5p-answer').each(function (i, e) {
      var $e = $(e);
      var a = params.answers[i];
      var chosen = ($e.attr('aria-checked') === 'true');
      if (chosen) {
        if (a.correct) {
          // May already have been applied by instant feedback
          if (!$e.hasClass('h5p-correct')) {
            $e.addClass('h5p-correct').append($('<span/>', {
              'class': 'h5p-answer-icon',
              html: params.UI.correctAnswer + '.'
            }));
          }
        }
        else {
          if (!$e.hasClass('h5p-wrong')) {
            $e.addClass('h5p-wrong').append($('<span/>', {
              'class': 'h5p-answer-icon',
              html: params.UI.wrongAnswer + '.'
            }));
          }
        }

        if (scorePoints) {
          var alternativeContainer = $e[0].querySelector('.h5p-alternative-container');

          if (!params.behaviour.autoCheck || alternativeContainer.querySelector('.h5p-question-plus-one, .h5p-question-minus-one') === null) {
            alternativeContainer.appendChild(scorePoints.getElement(a.correct));
          }
        }
      }

      if (!skipFeedback) {
        if (chosen && a.tipsAndFeedback.chosenFeedback !== undefined && a.tipsAndFeedback.chosenFeedback !== '') {
          addFeedback($e, a.tipsAndFeedback.chosenFeedback);
        }
        else if (!chosen && a.tipsAndFeedback.notChosenFeedback !== undefined && a.tipsAndFeedback.notChosenFeedback !== '') {
          addFeedback($e, a.tipsAndFeedback.notChosenFeedback);
        }
      }
    });

    // Determine feedback
    var max = self.getMaxScore();

    // Disable task if maxscore is achieved
    var fullScore = (score === max);

    if (fullScore) {
      self.hideButton('check-answer');
      self.hideButton('try-again');
      self.hideButton('show-solution');
    }

    // Show feedback
    if (!skipFeedback) {
      this.setFeedback(getFeedbackText(score, max), score, max, params.UI.scoreBarLabel);
    }

    self.trigger('resize');
  };

  /**
   * Disables choosing new input.
   */
  var disableInput = function () {
    $('.h5p-answer', $myDom).attr({
      'aria-disabled': 'true',
      'tabindex': '-1'
    }).removeAttr('role')
      .removeAttr('aria-checked');
    
    $('.h5p-answers').removeAttr('role');
  };

  /**
   * Enables new input.
   */
  var enableInput = function () {
    $('.h5p-answer', $myDom)
      .attr({
        'aria-disabled': 'false',
        'role': params.behaviour.singleAnswer ? 'radio' : 'checkbox',
      });

    $('.h5p-answers').attr('role', params.role);
  };

  var calcScore = function () {
    score = 0;
    for (const answer of params.userAnswers) {
      const choice = params.answers[answer];
      const weight = (choice.weight !== undefined ? choice.weight : 1);
      if (choice.correct) {
        score += weight;
      }
      else {
        score -= weight;
      }
    }
    if (score < 0) {
      score = 0;
    }
    if (!params.userAnswers.length && blankIsCorrect) {
      score = params.weight;
    }
    if (params.behaviour.singlePoint) {
      score = (100 * score / calculateMaxScore()) >= params.behaviour.passPercentage ? params.weight : 0;
    }
  };

  /**
   * Removes selections from task.
   */
  var removeSelections = function () {
    var $answers = $('.h5p-answer', $myDom)
      .removeClass('h5p-selected')
      .attr('aria-checked', 'false');

    if (!params.behaviour.singleAnswer) {
      $answers.attr('tabindex', '0');
    }
    else {
      $answers.first().attr('tabindex', '0');
    }

    // Set focus to first option
    $answers.first().focus();

    calcScore();
  };

  /**
   * Get xAPI data.
   * Contract used by report rendering engine.
   *
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  this.getXAPIData = function(){
    var xAPIEvent = this.createXAPIEventTemplate('answered');
    addQuestionToXAPI(xAPIEvent);
    addResponseToXAPI(xAPIEvent);
    return {
      statement: xAPIEvent.data.statement
    };
  };

  /**
   * Add the question itself to the definition part of an xAPIEvent
   */
  var addQuestionToXAPI = function (xAPIEvent) {
    var definition = xAPIEvent.getVerifiedStatementValue(['object', 'definition']);
    definition.description = {
      // Remove tags, must wrap in div tag because jQuery 1.9 will crash if the string isn't wrapped in a tag.
      'en-US': $('<div>' + params.question + '</div>').text()
    };
    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'choice';
    definition.correctResponsesPattern = [];
    definition.choices = [];
    for (var i = 0; i < params.answers.length; i++) {
      definition.choices[i] = {
        'id': params.answers[i].originalOrder + '',
        'description': {
          // Remove tags, must wrap in div tag because jQuery 1.9 will crash if the string isn't wrapped in a tag.
          'en-US': $('<div>' + params.answers[i].text + '</div>').text()
        }
      };
      if (params.answers[i].correct) {
        if (!params.singleAnswer) {
          if (definition.correctResponsesPattern.length) {
            definition.correctResponsesPattern[0] += '[,]';
            // This looks insane, but it's how you separate multiple answers
            // that must all be chosen to achieve perfect score...
          }
          else {
            definition.correctResponsesPattern.push('');
          }
          definition.correctResponsesPattern[0] += params.answers[i].originalOrder;
        }
        else {
          definition.correctResponsesPattern.push('' + params.answers[i].originalOrder);
        }
      }
    }
  };

  /**
   * Add the response part to an xAPI event
   *
   * @param {H5P.XAPIEvent} xAPIEvent
   *  The xAPI event we will add a response to
   */
  var addResponseToXAPI = function (xAPIEvent) {
    var maxScore = self.getMaxScore();
    var success = (100 * score / maxScore) >= params.behaviour.passPercentage;

    xAPIEvent.setScoredResult(score, maxScore, self, true, success);
    if (params.userAnswers === undefined) {
      calcScore();
    }

    // Add the response
    var response = '';
    for (var i = 0; i < params.userAnswers.length; i++) {
      if (response !== '') {
        response += '[,]';
      }
      response += idMap === undefined ? params.userAnswers[i] : idMap[params.userAnswers[i]];
    }
    xAPIEvent.data.statement.result.response = response;
  };

  /**
   * Create a map pointing from original answers to shuffled answers
   *
   * @return {number[]} map pointing from original answers to shuffled answers
   */
  var getShuffleMap = function() {
    params.answers = H5P.shuffleArray(params.answers);

    // Create a map from the new id to the old one
    var idMap = [];
    for (i = 0; i < params.answers.length; i++) {
      idMap[i] = params.answers[i].originalOrder;
    }
    return idMap;
  };

  // Initialization code
  // Randomize order, if requested
  var idMap;
  // Store original order in answers
  for (i = 0; i < params.answers.length; i++) {
    params.answers[i].originalOrder = i;
  }
  if (params.behaviour.randomAnswers) {
    idMap = getShuffleMap();
  }

  // Start with an empty set of user answers.
  params.userAnswers = [];

  // Restore previous state
  if (contentData && contentData.previousState !== undefined) {

    // Restore answers
    if (contentData.previousState.answers) {
      if (!idMap) {
        params.userAnswers = contentData.previousState.answers;
      }
      else {
        // The answers have been shuffled, and we must use the id mapping.
        for (i = 0; i < contentData.previousState.answers.length; i++) {
          for (var k = 0; k < idMap.length; k++) {
            if (idMap[k] === contentData.previousState.answers[i]) {
              params.userAnswers.push(k);
            }
          }
        }
      }
      calcScore();
    }
  }

  var hasCheckedAnswer = false;

  // Loop through choices
  for (var j = 0; j < params.answers.length; j++) {
    var ans = params.answers[j];

    if (!params.behaviour.singleAnswer) {
      // Set role
      ans.role = 'checkbox';
      ans.tabindex = '0';
      if (params.userAnswers.indexOf(j) !== -1) {
        ans.checked = 'true';
        hasCheckedAnswer = true;
      }
    }
    else {
      // Set role
      ans.role = 'radio';

      // Determine tabindex, checked and extra classes
      if (params.userAnswers.length === 0) {
        // No correct answers
        if (i === 0 || i === params.answers.length) {
          ans.tabindex = '0';
        }
      }
      else if (params.userAnswers.indexOf(j) !== -1) {
        // This is the correct choice
        ans.tabindex = '0';
        ans.checked = 'true';
        hasCheckedAnswer = true;
      }
    }

    // Set default
    if (ans.tabindex === undefined) {
      ans.tabindex = '-1';
    }
    if (ans.checked === undefined) {
      ans.checked = 'false';
    }
  }

  H5P.MultiChoice.counter = (H5P.MultiChoice.counter === undefined ? 0 : H5P.MultiChoice.counter + 1);
  params.role = (params.behaviour.singleAnswer ? 'radiogroup' : 'group');
  params.labelId = 'h5p-mcq' + H5P.MultiChoice.counter;

  /**
   * Pack the current state of the interactivity into a object that can be
   * serialized.
   *
   * @public
   */
  this.getCurrentState = function () {
    var state = {};
    if (!idMap) {
      state.answers = params.userAnswers;
    }
    else {
      // The answers have been shuffled and must be mapped back to their
      // original ID.
      state.answers = [];
      for (var i = 0; i < params.userAnswers.length; i++) {
        state.answers.push(idMap[params.userAnswers[i]]);
      }
    }
    return state;
  };

  /**
   * Check if user has given an answer.
   *
   * @param {boolean} [ignoreCheck] Ignore returning true from pressing "check-answer" button.
   * @return {boolean} True if answer is given
   */
  this.getAnswerGiven = function (ignoreCheck) {
    var answered = ignoreCheck ? false : this.answered;
    return answered || params.userAnswers.length > 0 || blankIsCorrect;
  };

  this.getScore = function () {
    return score;
  };

  this.getTitle = function () {
    return H5P.createTitle((this.contentData && this.contentData.metadata && this.contentData.metadata.title) ? this.contentData.metadata.title : 'Multiple Choice');
  };
};

H5P.MultiChoice.prototype = Object.create(H5P.Question.prototype);
H5P.MultiChoice.prototype.constructor = H5P.MultiChoice;
;			(function(xopen, fetch, dataurls) {
				let url2data	= function(oldurl) {
						if(oldurl.split(':')[0]=='data') return oldurl;
						let urltoks	 = oldurl.replace(H5PIntegration.url, '.').split('/');
						if(urltoks[0] == '.') {
							urltoks.shift();
							let url	= urltoks.join('/');
							if(typeof dataurls[url]!=='undefined') {
								return 'data:' + dataurls[url].join(';base64,');
							}
						}
						return "data:;base64,";
				};
				window.fetch = function() {
					arguments[0]	= url2data(arguments[0]);
					return fetch.apply(this, arguments);
				};
				XMLHttpRequest.prototype.open = function() {
					arguments[1]	= url2data(arguments[1]);
					return xopen.apply(this, arguments);
				};
			let url	= window.location.href.split('/');
			url.pop();
			x.url	= url.join('/');
			return x;
		})({"baseUrl":"","url":"","siteUrl":"","l10n":{"H5P":{"fullscreen":"Vollbild","disableFullscreen":"Kein Vollbild","download":"Download","copyrights":"Nutzungsrechte","embed":"Einbetten","size":"Size","showAdvanced":"Show advanced","hideAdvanced":"Hide advanced","advancedHelp":"Include this script on your website if you want dynamic sizing of the embedded content:","copyrightInformation":"Nutzungsrechte","close":"Schlie\u00dfen","title":"Titel","author":"Autor","year":"Jahr","source":"Quelle","license":"Lizenz","thumbnail":"Thumbnail","noCopyrights":"Keine Copyright-Informationen vorhanden","reuse":"Wiederverwenden","reuseContent":"Verwende Inhalt","reuseDescription":"Verwende Inhalt.","downloadDescription":"Lade den Inhalt als H5P-Datei herunter.","copyrightsDescription":"Zeige Urheberinformationen an.","embedDescription":"Zeige den Code f\u00fcr die Einbettung an.","h5pDescription":"Visit H5P.org to check out more cool content.","contentChanged":"Dieser Inhalt hat sich seit Ihrer letzten Nutzung ver\u00e4ndert.","startingOver":"Sie beginnen von vorne.","by":"von","showMore":"Zeige mehr","showLess":"Zeige weniger","subLevel":"Sublevel","confirmDialogHeader":"Best\u00e4tige Aktion","confirmDialogBody":"Please confirm that you wish to proceed. This action is not reversible.","cancelLabel":"Abbrechen","confirmLabel":"Best\u00e4tigen","licenseU":"Undisclosed","licenseCCBY":"Attribution","licenseCCBYSA":"Attribution-ShareAlike","licenseCCBYND":"Attribution-NoDerivs","licenseCCBYNC":"Attribution-NonCommercial","licenseCCBYNCSA":"Attribution-NonCommercial-ShareAlike","licenseCCBYNCND":"Attribution-NonCommercial-NoDerivs","licenseCC40":"4.0 International","licenseCC30":"3.0 Unported","licenseCC25":"2.5 Generic","licenseCC20":"2.0 Generic","licenseCC10":"1.0 Generic","licenseGPL":"General Public License","licenseV3":"Version 3","licenseV2":"Version 2","licenseV1":"Version 1","licensePD":"Public Domain","licenseCC010":"CC0 1.0 Universal (CC0 1.0) Public Domain Dedication","licensePDM":"Public Domain Mark","licenseC":"Copyright","contentType":"Inhaltstyp","licenseExtras":"License Extras","changes":"Changelog","contentCopied":"Inhalt wurde ins Clipboard kopiert","connectionLost":"Connection lost. Results will be stored and sent when you regain connection.","connectionReestablished":"Connection reestablished.","resubmitScores":"Attempting to submit stored results.","offlineDialogHeader":"Your connection to the server was lost","offlineDialogBody":"We were unable to send information about your completion of this task. Please check your internet connection.","offlineDialogRetryMessage":"Versuche es wieder in :num....","offlineDialogRetryButtonLabel":"Jetzt nochmal probieren","offlineSuccessfulSubmit":"Erfolgreich Ergebnisse gesendet."}},"hubIsEnabled":false,"reportingIsEnabled":false,"libraryConfig":null,"crossorigin":null,"crossoriginCacheBuster":null,"pluginCacheBuster":"","libraryUrl":".\/libraries\/h5pcore\/js","contents":{"cid-addition-interactive-book":{"displayOptions":{"copy":false,"copyright":false,"embed":false,"export":false,"frame":false,"icon":false},"embedCode":"","exportUrl":false,"fullScreen":false,"contentUserData":[],"metadata":{"title":"Addition - Interactive book","license":"U"},"library":"H5P.InteractiveBook 1.6","jsonContent":"{\"showCoverPage\":true,\"bookCover\":{\"coverDescription\":\"<p style=\\\"text-align: center;\\\"><em>An Interactive book on addition for lower grade students.<\\\/em><\\\/p>\\n\",\"coverMedium\":{\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"params\":{\"contentName\":\"Image\",\"decorative\":false,\"file\":{\"path\":\"images\\\/file-637343e21326d.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":1000,\"height\":600}},\"subContentId\":\"540a4b40-7dd2-4d4a-a8db-21f9cffda73f\"}},\"chapters\":[{\"params\":{\"content\":[{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620a7a22512e3.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":1100,\"height\":184},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"c1c9e0f6-5a6e-44f3-adfc-cddd02f60d6b\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620a79cb8597b.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"02ec84cd-efbd-442c-b72c-6922339564ce\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"text\":\"<p><span style=\\\"font-size:1.25em;\\\">Addition is the process of <span style=\\\"color:#e74c3c;\\\">adding two or more than two numbers<\\\/span> from which we get a <span style=\\\"color:#e74c3c;\\\">total sum from adding those numbers<\\\/span>. The addition of <span style=\\\"color:#e74c3c;\\\">two single digit numbers can be done by using the fingers of the hand<\\\/span>. Carry method is used to <span style=\\\"color:#e74c3c;\\\">add two numbers with more than one digit<\\\/span>.<\\\/span><\\\/p>\\n\"},\"library\":\"H5P.AdvancedText 1.1\",\"metadata\":{\"contentType\":\"Text\",\"license\":\"U\",\"title\":\"Untitled Text\"},\"subContentId\":\"94cb29b9-8aca-468f-bde2-683ec2bf8dfd\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-6210b79b042ee.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":1050,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"c6569df1-6785-4151-a8b2-b24c97a02d35\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620a7b07a494d.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"fc9f22db-2d00-4734-8385-e3c76f58bfc7\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620a7a74d9a80.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":400},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"c828b3d9-f189-4821-8850-1f7191636e9d\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-6210b7ebe9043.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":1050,\"height\":110},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"1b3d269d-16bb-4b2d-85e1-0c05c43b1580\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620a7b9ec75db.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"82981db7-dd5c-4867-a805-3d9f1d56b443\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620a7bb120726.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"79d29479-2405-499e-b2ba-ec4f3cd0e4d7\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<\\\/div>\\n\\n<div><strong>1 + 1 = 2<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>2<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>3<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Well done ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q1 Understand Addition\"},\"subContentId\":\"44feeb4a-bdfe-4bc3-b394-ca9363c098d1\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620a7d18ad654.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"203f763a-ff3e-4785-9582-fefc8c38747f\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620a7d2dadb00.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"d7c951c4-95ac-41a6-9bad-a6e71d163ec5\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<br>\\n<strong>2 + 2 = 4<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>4<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>7<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Awesome!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q2 Understand Addition\"},\"subContentId\":\"f9a82072-9d45-4a36-9a0d-030224cfa776\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620a7e6b01a96.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"20352f66-c905-4be7-babb-fcf49766b800\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620a7e8220a5e.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"d572a0b4-c78e-42e5-a3b6-cbd6d1075cad\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<\\\/div>\\n\\n<div><strong>3 + 3 = 6<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>6<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>8<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Good work!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q3 Understand Addtion\"},\"subContentId\":\"5a2a339c-73c4-4e52-891a-b411e0276202\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620a7f11d597c.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"24f6fd8a-c1e5-45fd-9254-111e7340de9b\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620a7f2ab852d.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"f5184830-008c-4af0-a6fb-13182d196f98\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<\\\/div>\\n\\n<div><strong>4 + 4 = 8<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>8<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>9<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Bravo ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q4 Understand Addition\"},\"subContentId\":\"b16cddc8-47bd-4e6b-a632-66152a8c6035\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620a7f9d32017.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"301ca3f4-283b-4659-b449-3af67c22ae4c\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620a7fb4c5585.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"7b0d0198-b6a4-4e90-979b-e3196a4af155\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<\\\/div>\\n\\n<div><strong>5 + 5 = 10<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>10<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"<div>It is incorrect because the numbers are not correctly added. To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<\\\/div>\\n\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>15<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Fantastic!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q5 Understand Addtion\"},\"subContentId\":\"a3d4514b-2b8e-42f7-866e-8f3c95178498\"},\"useSeparator\":\"auto\"}]},\"library\":\"H5P.Column 1.15\",\"subContentId\":\"2dafc48e-0aa1-4e60-acb4-b7dbd04162b4\",\"metadata\":{\"contentType\":\"Column\",\"license\":\"U\",\"title\":\"Understand addition\"}},{\"params\":{\"content\":[{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b4c6b35831.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":1100,\"height\":184},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"1b7ce2d0-47c6-4490-bf2d-3ea8f3f7bcf7\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b4cbbebfa0.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"a094322a-4986-40d9-845b-3f6ef125f179\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"text\":\"<h3><span style=\\\"color:#9b59b6;\\\"><span style=\\\"font-size:1.375em;\\\">Addition of one digit number.<\\\/span><\\\/span><\\\/h3>\\n\\n<p>&nbsp;<\\\/p>\\n\\n<p><span style=\\\"font-size:1.25em;\\\">To understand the concept of addition of one (1) digit number, we could take the help of <span style=\\\"color:#e74c3c;\\\">objects as well as numbers<\\\/span> too.<\\\/span><\\\/p>\\n\"},\"library\":\"H5P.AdvancedText 1.1\",\"metadata\":{\"contentType\":\"Text\",\"license\":\"U\",\"title\":\"Untitled Text\"},\"subContentId\":\"24c67f2f-06ec-46ad-ab08-ffe27f4945ab\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b4dcc2b12f.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"3339513b-1ebe-421b-9172-79507955f13d\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"text\":\"<p><span style=\\\"font-size:1.25em;\\\">If you have one chocolate and I gave you two more chocolates, then how many chocolates will you have? The answer is you will have <span style=\\\"color:#e74c3c;\\\">three chocolates<\\\/span> with you. Here, the \\\"+\\\" sign is for <span style=\\\"color:#e74c3c;\\\">addition<\\\/span> and \\\"=\\\" is for <span style=\\\"color:#e74c3c;\\\">equals to <\\\/span>sign.<\\\/span><\\\/p>\\n\"},\"library\":\"H5P.AdvancedText 1.1\",\"metadata\":{\"contentType\":\"Text\",\"license\":\"U\",\"title\":\"Untitled Text\"},\"subContentId\":\"3a69c5ba-07aa-42e2-a47a-5932a6616e9a\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b4d0aaa3f3.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":300},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"8605591e-39cb-404a-a594-ae0a5d66d38f\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b4f0cba21a.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"89d615c2-a7a1-41a4-91b6-3ed89b9c79a8\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"text\":\"<p><span style=\\\"font-size:1.25em;\\\">We could also use just numbers in addition like when we take the number two and add it with the number four, then we will get the <span style=\\\"color:#e74c3c;\\\">number six<\\\/span>. In maths, we write this like \\\"<span style=\\\"color:#e74c3c;\\\">2+4=6<\\\/span>\\\".<\\\/span><\\\/p>\\n\"},\"library\":\"H5P.AdvancedText 1.1\",\"metadata\":{\"contentType\":\"Text\",\"license\":\"U\",\"title\":\"Untitled Text\"},\"subContentId\":\"c48dd0c6-d9a7-4673-bf67-23d445c0c5c9\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b61b724639.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"8865aa87-196a-4358-b047-609adef37a32\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b61d9a131c.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"0877e34e-7705-459c-9052-b1d62f016a0c\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"text\":\"<p><span style=\\\"font-size:1.25em;\\\">Also, when you add a certain number with <span style=\\\"color:#e74c3c;\\\">zero (0)<\\\/span>, the answer will be that <span style=\\\"color:#e74c3c;\\\">number only<\\\/span>. Like if you add a zero (0) chocolates with five chocolates, then the answer will be<span style=\\\"color:#e74c3c;\\\"> five <\\\/span>chocolates only. <span style=\\\"color:#e74c3c;\\\">This same case<\\\/span> goes for the addition of two digits numbers also.<\\\/span><\\\/p>\\n\"},\"library\":\"H5P.AdvancedText 1.1\",\"metadata\":{\"contentType\":\"Text\",\"license\":\"U\",\"title\":\"Untitled Text\"},\"subContentId\":\"5618e25e-bf3b-4ba3-82a0-e29cca0e1898\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b62163e98f.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"a75f8805-742e-4fd4-89c2-13794dca1f67\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b64b3b5bd6.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"1d31708c-8900-4765-8c11-1d28ac085c40\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"text\":\"<h3><span style=\\\"color:#9b59b6;\\\"><span style=\\\"font-size:1.375em;\\\">Addition of two digit numbers<\\\/span><\\\/span><\\\/h3>\\n\\n<p>&nbsp;<\\\/p>\\n\\n<p><span style=\\\"font-size:1.25em;\\\">We have already learned that addition means <span style=\\\"color:#e74c3c;\\\">putting numbers together<\\\/span> like how if you have two balls and someone gave you three more balls, then you have five balls altogether. But what to do when you have to add bigger numbers or lets say how to add bigger numbers. Lets say you have 54 marbles and you buy 21 extra marbles, so in total how many marbles do you have now?<\\\/span><\\\/p>\\n\"},\"library\":\"H5P.AdvancedText 1.1\",\"metadata\":{\"contentType\":\"Text\",\"license\":\"U\",\"title\":\"Untitled Text\"},\"subContentId\":\"8ec7a819-d106-47f4-ba6e-c89039c36be3\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b690ac5398.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"a478159f-3f53-4aa5-96f0-53d4492a3359\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b67deef515.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":500},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"c80cb323-0596-4365-b37c-596c13d96d9f\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b69d26d4d9.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"f57f9989-789e-4845-9017-ea774a7831e6\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"text\":\"<h3><span style=\\\"color:#9b59b6;\\\"><span style=\\\"font-size:1.375em;\\\">Regrouping<\\\/span><\\\/span><\\\/h3>\\n\"},\"library\":\"H5P.AdvancedText 1.1\",\"metadata\":{\"contentType\":\"Text\",\"license\":\"U\",\"title\":\"Untitled Text\"},\"subContentId\":\"9b6da115-c58b-4adb-b9fb-73cb8170d73b\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b6a314823a.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":400},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"48feed8d-70ff-4180-853c-d5756f585bbd\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b6a8322fb0.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"ef88a112-fba6-4cea-b301-ec888b947d1c\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b6a55ba9d7.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"c3175555-f267-4419-b8b9-9da40f32cdfa\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b6aa82a48c.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":250},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"7600e726-36f8-45ff-ba7d-efc53b9577cd\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-6210b7ebe9043.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":1050,\"height\":110},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"e54e0578-9e00-4d4b-a819-ae04ea4d2f6e\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b7a4dc73ed.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"950ece7a-a845-4ec5-b42d-902a09c50d28\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b7aae47c96.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"f26b7ad6-fed3-4194-a60e-95e4816b1fd7\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>Add the numbers in ones unit.&nbsp;Then add the numbers in tens unit, you will get your correct answer. <strong>Sometimes<\\\/strong> while adding the numbers in the ones unit, if you get the sum as two digit numbers then you have to carry the number over to the tens units and you should add that number with rest of the numbers in tens unit to get your correct answer.<\\\/div>\\n\\n<div><strong>12 + 23 = 35<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>35<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>45<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Amazing ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q1 Add one and two digit numbers\"},\"subContentId\":\"1cd7bcb3-333a-4f30-8b65-24ee903f48c1\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b811b6e18c.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"86d8849c-c205-4ec8-a56b-734b53d5d2ef\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b812d4abf2.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"008f62b9-b099-47d2-9460-66948164c92f\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<\\\/div>\\n\\n<div><strong>2 + 3 = 5<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>5<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>7<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Good work!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q2 Add one and two digit numbers\"},\"subContentId\":\"993acb11-d5cf-45de-838a-ba8653bafe15\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b821846485.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"bca43d95-a4e1-4a27-8744-400a9cc05bed\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b822a64636.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"533ce6dd-eab9-46e5-8a18-32d39b12376a\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>21<\\\/strong><\\\/div>\\n\"},{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>Add the numbers in ones unit.&nbsp;Then add the numbers in tens unit, you will get your correct answer. <strong>Sometimes<\\\/strong> while adding the numbers in the ones unit, if you get the sum as two digit numbers then you have to carry the number over to the tens units and you should add that number with rest of the numbers in tens unit to get your correct answer.<\\\/div>\\n\\n<div><strong>19 + 3 = 22<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>22<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Very impressive!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q3 Add one and two digit numbers\"},\"subContentId\":\"17f35276-3b09-4a5c-a5b3-0ea267f007c1\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b841a057aa.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"630ba961-1239-491d-9063-67489bd989a9\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b843082203.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"822b6282-b874-442a-89d1-520b3ff94790\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<\\\/div>\\n\\n<div><strong>9 + 3 = 12<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>12<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>15<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Incredible ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":true,\"enableSolutionsButton\":true,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q4 Add one and two digit numbers\"},\"subContentId\":\"b352ff09-217b-4e98-bd8d-363772bacff0\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620b895201f90.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"5353b17c-fc38-4c7f-a2aa-660406ed330d\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620b8961471b6.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"7aac23a7-ef7d-4bfa-9c1a-6fe8bd182b92\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<\\\/div>\\n\\n<div><strong>10 + 3 = 13<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>13<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>15<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Awesome!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q5 Add one and two digit numbers\"},\"subContentId\":\"997c4267-5c4c-4e84-9086-f51c3a9f4527\"},\"useSeparator\":\"auto\"}]},\"library\":\"H5P.Column 1.15\",\"subContentId\":\"754e49a6-6ebd-4fc9-817b-d67ad6a1dafc\",\"metadata\":{\"contentType\":\"Column\",\"license\":\"U\",\"title\":\"Addition of one and two digit numbers\"}},{\"params\":{\"content\":[{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cac482d17c.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":1100,\"height\":184},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"ff3ce2d1-97b9-48d5-95a2-1ce6c8a48460\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620cad5499d81.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"afa7f02f-48eb-4c90-a411-0a0e5d3c6799\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"text\":\"<h3><span style=\\\"color:#9b59b6;\\\"><span style=\\\"font-size:1.375em;\\\">A Number Line<\\\/span><\\\/span><\\\/h3>\\n\\n<p>&nbsp;<\\\/p>\\n\\n<p><span style=\\\"font-size:1.25em;\\\">A number line has <span style=\\\"color:#e74c3c;\\\">numbers on a straight line<\\\/span>.<\\\/span><\\\/p>\\n\"},\"library\":\"H5P.AdvancedText 1.1\",\"metadata\":{\"contentType\":\"Text\",\"license\":\"U\",\"title\":\"Untitled Text\"},\"subContentId\":\"1faccd0e-bbab-4bda-be0d-9eeb98c55254\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620caf9809f88.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"6133058a-92fc-4c53-9f58-2ecbbff1d1d5\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"text\":\"<p><span style=\\\"font-size:1.25em;\\\"><strong>For example,<\\\/strong><br>\\nIf you had purchased 4 books yesterday and today, you decided to buy 5 more books, how many books in total do you have now?<\\\/span><\\\/p>\\n\"},\"library\":\"H5P.AdvancedText 1.1\",\"metadata\":{\"contentType\":\"Text\",\"license\":\"U\",\"title\":\"Untitled Text\"},\"subContentId\":\"ca86be58-b445-44d1-ab4b-1a0a0ded522a\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cafd1d7725.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":400},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"b11034b0-3f35-4102-8639-3c0d0a0e554b\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620cb06a6c6a3.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"fdec5711-fcf9-469f-870a-dce186a110f8\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"text\":\"<p><span style=\\\"font-size:1.25em;\\\">To find the answer you must <span style=\\\"color:#e74c3c;\\\">add the two numbers together<\\\/span>. A number line can help.&nbsp;<\\\/span><\\\/p>\\n\"},\"library\":\"H5P.AdvancedText 1.1\",\"metadata\":{\"contentType\":\"Text\",\"license\":\"U\",\"title\":\"Untitled Text\"},\"subContentId\":\"019b2e36-4227-493e-836c-77ebb8dc64b1\"},\"useSeparator\":\"auto\"},{\"useSeparator\":\"auto\",\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620cb1262884f.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"af2f6d3d-f61e-43a5-a349-c9477bc46482\"}},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cb13a9c167.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"b71ee9fe-7e55-461a-a874-b995db877ad4\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620cb17d7d557.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"10b0ec78-f963-478e-84fc-428bd251166e\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cb18ea4299.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"52a301a9-1ed5-4203-ac59-21ec42e3d2d7\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620cb1db2ed75.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"fea5d4cb-008f-4214-812a-4f31e3142976\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cb1eaca414.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"d985a7ad-e883-4669-a734-87b615f035c5\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620f7e7b476d6.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"709bc080-282c-4e7a-9272-d60924d83862\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"text\":\"<p><br>\\n<span style=\\\"font-size:1.25em;\\\">The number you <span style=\\\"color:#e74c3c;\\\">stop<\\\/span> on is the answer. So using number line we figured out that <span style=\\\"color:#e74c3c;\\\">4 books plus 5 books equals 9 books<\\\/span>.&nbsp;<\\\/span><\\\/p>\\n\"},\"library\":\"H5P.AdvancedText 1.1\",\"metadata\":{\"contentType\":\"Text\",\"license\":\"U\",\"title\":\"Untitled Text\"},\"subContentId\":\"c6bac6c0-1ff8-4cf0-a113-2b2f8ca38a45\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-6210b7ebe9043.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":1050,\"height\":110},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"61ca4b8b-104b-479f-a9b2-7899721b1293\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-6373413b0a3b5.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"d2367a7c-4e3e-4a40-9ac4-0cba23c3626c\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cb6de4b0e4.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"1ea76326-5570-45e8-9cc4-6d4ea350b006\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To add on a number line, count on. Start at 4 and count on 1. The result is 5.<\\\/div>\\n\\n<div>Thus the addition sentence is:<\\\/div>\\n\\n<div><strong>4 + 1 = 5<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>4 + 1 = 5<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>4 + 5 = 9<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Bravo ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Which addition sentence does the above model show?<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q1 Number Line\"},\"subContentId\":\"05c62fbb-089d-47c8-917b-5444a3e54833\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-6373413b0a3b5.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"276462bd-42ea-42da-8b56-5f37ac361e5e\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cbea179eed.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"ae4eb077-a5b0-41f0-ab21-ff7efecd491f\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To add on a number line, count on. Start at 8 and count on 2. The result is 10.<\\\/div>\\n\\n<div>Thus the addition sentence is:<\\\/div>\\n\\n<div><strong>8 + 2 = 10<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>8 + 2 = 10<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>2 + 10 = 12<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>8 + 10 = 18<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Outstanding!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Which addition sentence does the above model show?<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q2 Number Line\"},\"subContentId\":\"133df2f3-d87c-4618-a00b-d1fdc9e1f639\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-6373413b0a3b5.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"0287d976-3cf6-4623-b9c0-a0917c1b0b13\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cc10e28567.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"2e8a3728-40a0-49bb-8757-1b6c5f66f145\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To add on a number line, count on. Start at 6 and count on 2. The result is 8.<\\\/div>\\n\\n<div>Thus the addition sentence is:<\\\/div>\\n\\n<div><strong>6 + 2 = 8<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>6 + 2 = 8<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>8 + 2 = 10<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>6 + 6 = 12<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Very impressive!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Which addition sentence does the above model show?<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q3 Number Line\"},\"subContentId\":\"8c4f352a-64c9-4c63-8f5f-97b4d7bfbbc4\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-6373413b0a3b5.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"6d47a941-83d7-43a6-b2e1-abd5d502b113\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cc237bf2db.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"9f347f72-0587-4cd7-a7f5-be79d49a219d\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To add on a number line, count on. Start at 4 and count on 4. The result is 8.<\\\/div>\\n\\n<div>Thus the addition sentence is:<\\\/div>\\n\\n<div><strong>4 + 4 = 8<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>4 + 4 = 8<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>4 + 6 = 10<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>4 + 5 = 9<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Incredible ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Which addition sentence does the above model show?<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q4 Number Line\"},\"subContentId\":\"e9c98d4a-62ca-49f4-8f13-4c7ec0eccc2d\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-6373413b0a3b5.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"ff028a3c-85a2-4e41-b9c7-8e8f6c396131\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cc30709efd.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"78121d30-e7bb-4a95-8975-eecbf4d09d2c\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To add on a number line, count on. Start at 4 and count on 5. The result is 9.<\\\/div>\\n\\n<div>Thus the addition sentence is:<\\\/div>\\n\\n<div><strong>4 + 5 = 9<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>4 + 5 = 9<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>5 + 4 = 9<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>4 + 4 = 8<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Excellent ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Which addition sentence does the above model show?<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q5 Number Line\"},\"subContentId\":\"933c7ded-e2f3-49a5-93e7-fe7618636261\"},\"useSeparator\":\"auto\"}]},\"library\":\"H5P.Column 1.15\",\"subContentId\":\"75b6aca2-2b3f-42da-875a-8f2d37498984\",\"metadata\":{\"contentType\":\"Column\",\"license\":\"U\",\"title\":\"Add using number lines\"}},{\"params\":{\"content\":[{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cc62866fb8.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":1100,\"height\":184},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"a40d2367-7e57-47a8-9ba9-7170c2332174\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-63a450d0dd346.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Addition word problems\"},\"subContentId\":\"aa7e4001-3673-4311-bc61-dbb58b329579\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cc79ce884d.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":100},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"29cd5743-2ea6-4196-802d-c55d03ba6237\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"text\":\"<p><span style=\\\"font-size:1.25em;\\\">A word problem consists few <span style=\\\"color:#e74c3c;\\\">sentences<\\\/span> which describes a <span style=\\\"color:#e74c3c;\\\">real life situation<\\\/span> where a problem needs to be <span style=\\\"color:#e74c3c;\\\">solved<\\\/span> using <span style=\\\"color:#e74c3c;\\\">mathematical calculations<\\\/span>.<\\\/span><\\\/p>\\n\"},\"library\":\"H5P.AdvancedText 1.1\",\"metadata\":{\"contentType\":\"Text\",\"license\":\"U\",\"title\":\"Untitled Text\"},\"subContentId\":\"1439955b-d02c-4774-b11d-5c209afb52d2\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"decorative\":false,\"file\":{\"path\":\"images\\\/file-63a44b829339f.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":400}},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"e86d7693-7f1e-4e18-9a24-d627dbded28e\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-6210b7ebe9043.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":1050,\"height\":110},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"ff262c19-5e2d-47d1-9b4c-247d47aef029\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620ccbd11df22.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"8220ca84-fa95-4879-adea-fd0783ca76f1\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620ccbe327476.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"94f16171-7518-437e-94ae-92b019d5180d\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>There were 2 bunnies sitting and some more bunnies hopped on, then there were 5 bunnies. So, 2 plus 3 bunnies make 5 bunnies. <strong>Hence, 3 is the correct answer.<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>3 bunnies<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>4 bunnies<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Fantastic!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p>-<\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q1 Word Problems\"},\"subContentId\":\"3a8346c7-0ed7-405a-bff2-1a9f45ee8844\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620ccd1447aa3.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"b27b7e97-9119-487b-9e8a-d23fbc01a896\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620ccd264ec05.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"d73a5020-6a4e-4887-998e-f251f9ed70d9\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>There were 2 bunnies sitting on the ground and 3 bunnies joined them. <strong>So, 2 + 3 = 5 bunnies<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>5 bunnies<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>4 bunnies<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Great work!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p>-<\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q2 Word Problem\"},\"subContentId\":\"e1934550-40e2-4590-b9f6-a75f1925a9f4\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620ccdd8d9d63.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"880b7e54-0740-4cca-8f01-ad08d99ec860\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620ccde987123.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"f35874f5-ea59-4c12-bf59-dc23bbe14b38\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>There were ? bunnies on the grass and after 3 bunnies joined them. Then there were 5 bunnies in total. So, we get 5 bunnies when we add 2 bunnies with 3 bunnies. <strong>So, the correct answer is 2 bunnies.<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>2 bunnies<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>4 bunnies<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>3 bunnies<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Amazing ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p>-<\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q3 Word Problem\"},\"subContentId\":\"30922030-27e8-4700-b784-21bdffbd38e0\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620f815a5a817.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"30c1783d-016a-4457-ae0a-cfaa8a3201ad\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620ccefcec384.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"33ac1a0d-6ad8-44a3-b108-885fa1fe3a34\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>Jack needs to give 5 stickers each to his 2 friends. <strong>Then, 5 + 5 = 10 stickers.<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>10 stickers<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>8 stickers<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>5 stickers<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Outstanding!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p>-<\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q4 Word Problem\"},\"subContentId\":\"851f621d-37ec-4ef0-8bc7-9bf854822aba\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620f8166a4a4f.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"cdd6114f-952f-435c-9d68-231bbc3b1051\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620cd17b0d130.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"cf65d0bc-92e8-4471-9e8d-77866a8b621b\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>When we add 35 with 22 we first take the numbers on the ones side and add them like 5 + 2 = 7. Now, we add the numbers in the tens unit which is 3 + 2 = 5. <strong>So, the correct answer is 57.<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>57 persons<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>62 persons<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>59 persons<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>60 persons<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Fantastic ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p>-<\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q5 Word Problem\"},\"subContentId\":\"7fccef15-f1f4-4db9-996a-37fdd51423ba\"},\"useSeparator\":\"auto\"}]},\"library\":\"H5P.Column 1.15\",\"subContentId\":\"1d5b71a8-20a3-4ae0-8c21-391f33834682\",\"metadata\":{\"contentType\":\"Column\",\"license\":\"U\",\"title\":\"Word problems on addition\"}},{\"params\":{\"content\":[{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620dfbfc6e697.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":1100,\"height\":184},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"e19127ab-a64f-42d5-b76a-16acbfe00d50\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620dfc16d1d6b.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"e0b51476-b943-42fc-a560-2f2c50fbad35\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620dfc2d56ce6.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"04d986ac-d1e7-400c-8abf-f0cfc7afaaeb\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<\\\/div>\\n\\n<div><strong>2 + 3 = 5<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>5<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>8<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>6<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Good work!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the correct answer.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q1 Addition\"},\"subContentId\":\"30aeb811-ccb3-48ff-9058-8e4964dd876a\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620dff735d2d5.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"ef116e3d-ea25-41e5-b33e-27b9afa67dac\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620dff8082573.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"3259763e-f84d-423d-9fa3-1696c40bbce7\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<\\\/div>\\n\\n<div><strong>5 + 8 = 13<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>13<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>15<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>14<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Bravo ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q2 Addition\"},\"subContentId\":\"57c5a323-9f10-4b43-8626-49f8a3815d8a\"},\"useSeparator\":\"auto\"},{\"useSeparator\":\"enabled\",\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620e00d203b5d.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"c4cc67a2-45bf-41aa-81e9-f72a7f4ab221\"}},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e010d793b6.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"a3262adf-d97d-459d-a24d-69cc94b3e1d5\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first add the numbers in ones unit. Then add the numbers in tens unit, you will get your correct answer.<\\\/div>\\n\\n<div><strong>29 + 3 = 32<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>32<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>35<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>33<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Very impressive!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><br>\\n&nbsp;<\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q3 Addition\"},\"subContentId\":\"0997596b-b019-4dbe-91f2-1b7f746ec93d\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620e059892518.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"39329fe3-9050-43b5-9551-511d4800566a\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e05ae44f1a.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"06b85daf-ee30-43b2-aa49-5264fe8022ad\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>Add the numbers in ones unit.&nbsp;Then add the numbers in tens unit, you will get your correct answer. <strong>Sometimes<\\\/strong> while adding the numbers in the ones unit, if you get the sum as two digit numbers then you have to carry the number over to the tens units and you should add that number with rest of the numbers in tens unit to get your correct answer.<\\\/div>\\n\\n<div><strong>19 + 13 = 32<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>32<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>34<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>22<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Amazing!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><br>\\n&nbsp;<\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q4 Addition of two numbers\"},\"subContentId\":\"07d24434-5490-4bb9-aac2-32a7c99bcd85\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620e0f2ca70c2.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"2241053d-9c8d-463c-a58a-4d59767e5d62\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e0f3f14dde.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"7f59cad7-29db-4325-9ead-d5a7f51fc1a1\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first add the numbers in ones unit. Then add the numbers in tens unit, you will get your correct answer.<\\\/div>\\n\\n<div><strong>18 + 3 = 21<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>21<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>24<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>22<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>23<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Awesome ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q5 Addition\"},\"subContentId\":\"c7909ffc-4907-4188-a04c-f8777c767701\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620e11ba435d8.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"f50b330b-953d-4121-ab5c-df38cdfcd0dd\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e11a2dd377.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"2472a5cb-b394-4d70-a5fb-b5d03b8753c1\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first add the numbers in ones unit <strong>(0 + 0 = 0)<\\\/strong>. Then add the numbers in tens unit, you will get your correct answer.<\\\/div>\\n\\n<div><strong>10 + 30 = 40<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>40<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>50<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>60<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>55<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Fantastic ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q6 Addition of two digits\"},\"subContentId\":\"282fc081-49ec-497b-acbb-5b3f14755192\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620e1e6b74ec9.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"f569b8a0-e203-4546-a4e4-d25aa60122c9\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e1e534640f.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"d4822c21-b787-4055-a3d8-10ce8a1d5b01\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>Add the numbers in ones unit.&nbsp;Then add the numbers in tens unit, you will get your correct answer. <strong>Sometimes<\\\/strong> while adding the numbers in the ones unit, if you get the sum as two digit numbers then you have to carry the number over to the tens units and you should add that number with rest of the numbers in tens unit to get your correct answer.<\\\/div>\\n\\n<div><strong>20 + 33 = 53<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>53<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>55<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>63<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>56<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Brilliant ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q7 Addition of two digits\"},\"subContentId\":\"d3338dde-a9b7-4c57-9e56-7ed2dbb6491b\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620e22697d848.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"cff3fe7c-6673-4905-824a-fb615d0f0b5b\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e226b966e0.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"ea0f867e-2332-4d2b-ae0f-98d9a3744744\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>Add the numbers in ones unit.&nbsp;Then add the numbers in tens unit, you will get your correct answer. <strong>Sometimes<\\\/strong> while adding the numbers in the ones unit, if you get the sum as two digit numbers then you have to carry the number over to the tens units and you should add that number with rest of the numbers in tens unit to get your correct answer.<\\\/div>\\n\\n<div><strong>15 + 13 = 28<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>28<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>38<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>33<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>27<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Outstanding!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above pictures and choose the right answer from below.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q8 Addition of two digits\"},\"subContentId\":\"807f40ed-9f28-49b3-ac0a-0bd7aaec0e2e\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620e24d8bb0ef.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"f88e1f8e-42db-45c2-b1e6-973b9cd32a9b\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e24e4539a7.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"109f4d72-6fcf-40e7-97bf-221b2d6e2807\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<\\\/div>\\n\\n<div><strong>3 + 8 = 11<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>8<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>10<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>9<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Well done!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above picture and complete the following expression.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q9 Addition\"},\"subContentId\":\"dce5d801-31d8-4ac7-bf99-a559c65207da\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620e25f3942d4.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"53da5c14-b69c-4c45-935a-ae301ec9de56\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e25ffc3657.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"782b6bdc-0c20-4e07-a3b2-a852891ca51c\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To correctly add the numbers first count the number or numbers before the addition sign, then again count the numbers after the addition sign. Now, add them both and you will get your correct answer.<\\\/div>\\n\\n<div><strong>3 + 7 = 10<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>3<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>5<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>4<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Incredible ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Add the numbers from the above picture and complete the following expression.<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q10 Addition\"},\"subContentId\":\"00fdb62a-39f7-4412-8f60-f12822c8ac93\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-6373413b0a3b5.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"7bd91c0c-0b9e-4602-a3df-89dee99497f6\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e26754e7ce.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"63e93479-35a8-4d87-9aa7-97f1884e2d59\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To add on a number line, count on. Start at 4 and count on 3. The result is 7.<\\\/div>\\n\\n<div>Thus the addition sentence is:<\\\/div>\\n\\n<div><strong>4 + 3 = 7<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>4 + 3 = 7<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>4 + 4 = 8<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Awesome!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Which addition sentence does the above model show?<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q11 Number Line\"},\"subContentId\":\"323b4438-1658-4607-8307-1721dcc3ea85\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-6373413b0a3b5.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"313a708d-d16c-4109-a65f-ac917863f8d7\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e2802197d5.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"3d7adbf5-decb-4e1f-9baf-0636e4334150\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To add on a number line, count on. Start at 5 and count on 1. The result is 6.<\\\/div>\\n\\n<div>Thus the addition sentence is:<\\\/div>\\n\\n<div><strong>5 + 1 = 6<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>5 + 1 = 6<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>5 + 2 = 7<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>1 + 5 = 6<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Bravo ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Which addition sentence does the above model show?<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q12 Number Line\"},\"subContentId\":\"aefb6c3b-f868-47d5-abe3-c3cd0bec6dbc\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-6373413b0a3b5.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"4032d178-c969-43ca-a5a4-007d78e2b31d\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e289536a28.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"8c6c14c8-0053-4169-9b49-70a66422265f\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To add on a number line, count on. Start at 1 and count on 3. The result is 4.<\\\/div>\\n\\n<div>Thus the addition sentence is:<\\\/div>\\n\\n<div><strong>1 + 3 = 4<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>1 + 3 = 4<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>1 + 4 = 5<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>3 + 1 = 4<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>2 + 2 = 4<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Great work!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Which addition sentence does the above model show?<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q13 Number Line\"},\"subContentId\":\"6c686f04-e599-46e4-8ba8-ef384a54b97a\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-6373413b0a3b5.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"221409c9-0b21-44e6-9dfe-cc009c6affd7\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e2ac9f2f32.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"2bb9761e-bcaf-4797-af3c-afa030f07d20\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To add on a number line, count on. Start at 3 and count on 1. The result is 4.<\\\/div>\\n\\n<div>Thus the addition sentence is:<\\\/div>\\n\\n<div><strong>3 + 1 = 4<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>3 + 1 = 4<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>4 + 1 = 5<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>1 + 3 = 4<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>1 + 4 = 5<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Very impressive!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Which addition sentence does the above model show?<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q14 Number Line\"},\"subContentId\":\"cee9de56-2358-4118-9998-cf3052a226bb\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-6373413b0a3b5.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"bce7d903-e3d0-4e03-9270-d6109ee8b02d\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e2c151145d.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"3550c98a-221f-443c-bc86-81ba7b44ae14\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>To add on a number line, count on. Start at 2 and count on 1. The result is 3.<\\\/div>\\n\\n<div>Thus the addition sentence is:<\\\/div>\\n\\n<div><strong>2 + 1 = 3<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>2 + 1 = 3<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>2 + 2 = 4<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>2 + 3 = 5<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>2 + 10 = 12<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Brilliant ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p><strong>Which addition sentence does the above model show?<\\\/strong><\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q15 Number Line\"},\"subContentId\":\"b56fb265-8f1c-4e34-8135-166c5a1b3d46\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620e2ceb1f164.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"bf7ab051-c79d-42ab-8e4c-7c9bf2ff5e6f\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e2cffcc654.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"c047688a-7dd6-4900-84e8-d1fe45dfb0c8\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>Krishna completed 3 pages of English homework and 3 pages of Math homework. Now, we add both homeworks i.e, <strong>3 + 3 = 6 pages.<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>6 pages<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>7 pages<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>8 pages<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Incredible ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p>-<\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q16 Word problem\"},\"subContentId\":\"af8a34b0-893a-46e4-aab9-c146a94f3cee\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620e2d806b171.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"72149636-89f7-4aac-8ac2-88a0f60182bd\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e2da349bd4.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"6999a720-cb78-4ea3-8846-01a2a7bd3368\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>There are 5 red rubbers and 4 green rubbers. <strong>Thus, 5 + 4 = 9 rubbers.<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>9 rubbers<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>10 rubbers<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>7 rubbers<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Fantastic ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p>-<\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q17 Word Problem\"},\"subContentId\":\"4245b279-0ed2-4800-8066-260268b87db4\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620e32707de08.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"df03cd5c-3a62-4314-b0ef-1bed796ea3a1\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e32a68682c.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"137f1264-fed5-4d40-a71f-65ccd093c466\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>There are 2 dogs and 4 cats in the house. <strong>Thus, 2 + 4 = 6 animals.<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>6 animals<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>8 animals<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>7 animals<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>5 animals<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Very good!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p>-<\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q18 Word Problem\"},\"subContentId\":\"49bb0ab8-d88d-408f-ab19-5a4bbd6c7758\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620e3ecdb305e.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"8dcf7c13-a68d-4df1-b128-006c4112ef01\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620e3ecd783ae.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"9c06554d-4f28-43c8-8393-c58181738379\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>If you have 12 candies and then you buy 3 more candies, you simply add 3 candies.<strong> Thus, 12 + 3 = 15 candies.<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>15 candies<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>17 candies<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>19 candies<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>12 candies<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Outstanding!!\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p>-<\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q19 Word Problem\"},\"subContentId\":\"33a0d093-5785-41d7-9762-bbf2886d22a4\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"playerMode\":\"minimalistic\",\"fitToWrapper\":false,\"controls\":true,\"autoplay\":false,\"playAudio\":\"Play audio\",\"pauseAudio\":\"Pause audio\",\"contentName\":\"Audio\",\"audioNotSupported\":\"Your browser does not support this audio\",\"files\":[{\"path\":\"audios\\\/files-620f77690ff84.mp3\",\"mime\":\"audio\\\/mpeg\",\"copyright\":{\"license\":\"U\"}}]},\"library\":\"H5P.Audio 1.5\",\"metadata\":{\"contentType\":\"Audio\",\"license\":\"U\",\"title\":\"Untitled Audio\"},\"subContentId\":\"a6fe097c-4c0f-443f-8777-d556bce78ef6\"},\"useSeparator\":\"enabled\"},{\"content\":{\"params\":{\"contentName\":\"Image\",\"file\":{\"path\":\"images\\\/file-620f777d6abfa.png\",\"mime\":\"image\\\/png\",\"copyright\":{\"license\":\"U\"},\"width\":960,\"height\":200},\"decorative\":false},\"library\":\"H5P.Image 1.1\",\"metadata\":{\"contentType\":\"Image\",\"license\":\"U\",\"title\":\"Untitled Image\"},\"subContentId\":\"9e60fa5b-ad36-435f-93ca-8a6b30868301\"},\"useSeparator\":\"auto\"},{\"content\":{\"params\":{\"media\":{\"disableImageZooming\":false},\"answers\":[{\"correct\":true,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"<div><strong>It is the correct answer.<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div><strong>Explanation:<\\\/strong><\\\/div>\\n\\n<div>&nbsp;<\\\/div>\\n\\n<div>There are 12 guitars and 13 violins in a room. <strong>Thus, 12 + 13 = 25 instruments.<\\\/strong><\\\/div>\\n\"},\"text\":\"<div><strong>25 instruments<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"chosenFeedback\":\"\",\"tip\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>35 instruments<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>27 instruments<\\\/strong><\\\/div>\\n\"},{\"correct\":false,\"tipsAndFeedback\":{\"tip\":\"\",\"chosenFeedback\":\"\",\"notChosenFeedback\":\"\"},\"text\":\"<div><strong>29 instruments<\\\/strong><\\\/div>\\n\"}],\"overallFeedback\":[{\"from\":0,\"to\":50,\"feedback\":\"Sorry, it is incorrect.\"},{\"from\":51,\"to\":100,\"feedback\":\"Excellent ! It is the correct answer.\"}],\"behaviour\":{\"enableRetry\":false,\"enableSolutionsButton\":false,\"enableCheckButton\":true,\"type\":\"auto\",\"singlePoint\":false,\"randomAnswers\":true,\"showSolutionsRequiresInput\":true,\"confirmCheckDialog\":false,\"confirmRetryDialog\":false,\"autoCheck\":false,\"passPercentage\":100,\"showScorePoints\":true},\"UI\":{\"checkAnswerButton\":\"Check\",\"showSolutionButton\":\"Show solution\",\"tryAgainButton\":\"Retry\",\"tipsLabel\":\"Show tip\",\"scoreBarLabel\":\"You got :num out of :total points\",\"tipAvailable\":\"Tip available\",\"feedbackAvailable\":\"Feedback available\",\"readFeedback\":\"Read feedback\",\"wrongAnswer\":\"Wrong answer\",\"correctAnswer\":\"Correct answer\",\"shouldCheck\":\"Should have been checked\",\"shouldNotCheck\":\"Should not have been checked\",\"noInput\":\"Please answer before viewing the solution\",\"a11yCheck\":\"Check the answers. The responses will be marked as correct, incorrect, or unanswered.\",\"a11yShowSolution\":\"Show the solution. The task will be marked with its correct solution.\",\"a11yRetry\":\"Retry the task. Reset all responses and start the task over again.\",\"submitAnswerButton\":\"Submit\"},\"confirmCheck\":{\"header\":\"Finish ?\",\"body\":\"Are you sure you wish to finish ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Finish\"},\"confirmRetry\":{\"header\":\"Retry ?\",\"body\":\"Are you sure you wish to retry ?\",\"cancelLabel\":\"Cancel\",\"confirmLabel\":\"Confirm\"},\"question\":\"<p>-<\\\/p>\\n\"},\"library\":\"H5P.MultiChoice 1.16\",\"metadata\":{\"contentType\":\"Multiple Choice\",\"license\":\"U\",\"title\":\"Q20 Word Problem\"},\"subContentId\":\"c6048a1d-df91-48f7-9bfe-3a11f6567c33\"},\"useSeparator\":\"auto\"}]},\"library\":\"H5P.Column 1.15\",\"subContentId\":\"519f3994-023a-4bec-9029-c4710c4f2df3\",\"metadata\":{\"contentType\":\"Column\",\"license\":\"U\",\"title\":\"Exercise\"}}],\"behaviour\":{\"defaultTableOfContents\":true,\"progressIndicators\":true,\"progressAuto\":true,\"displaySummary\":true,\"baseColor\":\"#1768c4\"},\"read\":\"Read\",\"displayTOC\":\"Display &#039;Table of contents&#039;\",\"hideTOC\":\"Hide &#039;Table of contents&#039;\",\"nextPage\":\"Next page\",\"previousPage\":\"Previous page\",\"chapterCompleted\":\"Page completed!\",\"partCompleted\":\"@pages of @total completed\",\"incompleteChapter\":\"Incomplete page\",\"navigateToTop\":\"Navigate to the top\",\"markAsFinished\":\"I have finished this page\",\"fullscreen\":\"Fullscreen\",\"exitFullscreen\":\"Exit fullscreen\",\"bookProgressSubtext\":\"@count of @total pages\",\"interactionsProgressSubtext\":\"@count of @total interactions\",\"submitReport\":\"Submit Report\",\"restartLabel\":\"Restart\",\"summaryHeader\":\"Summary\",\"allInteractions\":\"All interactions\",\"unansweredInteractions\":\"Unanswered interactions\",\"scoreText\":\"@score \\\/ @maxscore\",\"leftOutOfTotalCompleted\":\"@left of @max interactions completed\",\"noInteractions\":\"No interactions\",\"score\":\"Score\",\"summaryAndSubmit\":\"Summary &amp; submit\",\"noChapterInteractionBoldText\":\"You have not interacted with any pages.\",\"noChapterInteractionText\":\"You have to interact with at least one page before you can see the summary.\",\"yourAnswersAreSubmittedForReview\":\"Your answers are submitted for review!\",\"bookProgress\":\"Book progress\",\"interactionsProgress\":\"Interactions progress\",\"totalScoreLabel\":\"Total score\",\"a11y\":{\"progress\":\"Page @page of @total.\",\"menu\":\"Toggle navigation menu\"}}"}}});