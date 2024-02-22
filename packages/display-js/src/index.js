import './lib/compatibility-check'

import { storeCallback, getCallbacks, removeCallback, swapCallbacks } from './lib/callbacks'
import { getMethodName, isDomElement, isHubstairsUrl, isNode, HubstairsError } from './lib/functions'
import { getOEmbedParameters, getOEmbedData, createEmbed, initializeEmbeds, resizeEmbeds } from './lib/embed'
import { parseMessageData, postMessage, processData } from './lib/postmessage'
import { logger } from './lib/logger'

const displayMap = new WeakMap()
const readyMap = new WeakMap()

class Display {
  /**
   * Create a Display.
   *
   * @param {(HTMLIFrameElement|HTMLElement|string|jQuery)} element A reference to the hubstairs
   *        display iframe, and id, or a jQuery object.
   * @param {object} [options] oEmbed parameters to use when creating an embed in the element.
   * @return {Display}
   */
  constructor(element, options = {}) {
    /* global jQuery */
    if (window.jQuery && element instanceof jQuery) {
      if (element.length > 1) {
        logger.warn('A jQuery object with multiple elements was passed, using the first element.')
      }

      element = element[0]
    }

    // Find an element by ID
    if (typeof document !== 'undefined' && typeof element === 'string') {
      element = document.getElementById(element)
    }

    // Not an element!
    if (!isDomElement(element)) {
      throw new HubstairsError('You must pass either a valid element or a valid id.', 'TypeError')
    }

    // Already initialized an embed in this div, so grab the iframe
    if (element.nodeName !== 'IFRAME') {
      const iframe = element.querySelector('iframe')

      if (iframe) {
        element = iframe
      }
    }

    // iframe url is not a hubstairs url
    if (element.nodeName === 'IFRAME' && !isHubstairsUrl(element.getAttribute('src') || '')) {
      throw new HubstairsError('The display element passed isn’t a Hubstairs embed.')
    }

    // If there is already a display object in the map, return that
    if (displayMap.has(element)) {
      return displayMap.get(element)
    }

    this._window = element.ownerDocument.defaultView
    this.element = element
    this.origin = '*'

    const readyPromise = new Promise((resolve, reject) => {
      this._onMessage = event => {
        if (!isHubstairsUrl(event.origin) || this.element.contentWindow !== event.source) {
          return
        }

        if (this.origin === '*') {
          this.origin = event.origin
        }

        const data = parseMessageData(event.data)
        const isError = data && data.event === 'error'
        const isReadyError = isError && data.data && data.data.method === 'ready'

        if (isReadyError) {
          const error = new HubstairsError(data.data.message, data.data.name)
          reject(error)
          return
        }

        const isReadyEvent = data && data.event === 'ready'
        const isPingResponse = data && data.method === 'ping'

        if (isReadyEvent || isPingResponse) {
          this.element.setAttribute('data-ready', 'true')
          if (this._originalElement) {
            element.firstElementChild.style.display = 'block'
          }
          resolve()
          return
        }

        processData(this, data)
      }

      this._window.addEventListener('message', this._onMessage)

      if (this.element.nodeName !== 'IFRAME') {
        const params = getOEmbedParameters(element, options)

        getOEmbedData(params)
          .then(data => {
            const iframe = createEmbed(data, element)
            // Overwrite element with the new iframe,
            // but store reference to the original element
            this.element = iframe
            this._originalElement = element

            swapCallbacks(element, iframe)
            displayMap.set(this.element, this)

            return data
          })
          .catch(reject)
      }
    })

    // Store a copy of this Display in the map
    readyMap.set(this, readyPromise)
    displayMap.set(this.element, this)

    // Send a ping to the iframe so the ready promise will be resolved if
    // the display is already ready.
    if (this.element.nodeName === 'IFRAME') {
      postMessage(this, 'ping')
    }

    return this
  }

  /**
   * Get a promise for a method.
   *
   * @param {string} name The API method to call.
   * @param {Object} [args={}] Arguments to send via postMessage.
   * @return {Promise}
   */
  callMethod(name, args = {}) {
    return new Promise((resolve, reject) => {
      // We are storing the resolve/reject handlers to call later, so we
      // can’t return here.
      return this.ready()
        .then(() => {
          storeCallback(this, name, {
            resolve,
            reject,
          })

          postMessage(this, name, args)
        })
        .catch(reject)
    })
  }

  /**
   * Get a promise for the value of a display property.
   *
   * @param {string} name The property name
   * @return {Promise}
   */
  get(name) {
    return new Promise((resolve, reject) => {
      name = getMethodName(name, 'get')

      // We are storing the resolve/reject handlers to call later, so we
      // can’t return here.
      return this.ready()
        .then(() => {
          storeCallback(this, name, {
            resolve,
            reject,
          })

          postMessage(this, name)
        })
        .catch(reject)
    })
  }

  /**
   * Get a promise for setting the value of a display property.
   *
   * @param {string} name The API method to call.
   * @param {mixed} value The value to set.
   * @return {Promise}
   */
  set(name, value) {
    return new Promise((resolve, reject) => {
      name = getMethodName(name, 'set')

      if (value === undefined) {
        throw new HubstairsError('There must be a value to set.', 'TypeError')
      }

      // We are storing the resolve/reject handlers to call later, so we
      // can’t return here.
      return this.ready()
        .then(() => {
          storeCallback(this, name, {
            resolve,
            reject,
          })

          postMessage(this, name, value)
        })
        .catch(reject)
    })
  }

  /**
   * Add an event listener for the specified event. Will call the
   * callback with a single parameter, `data`, that contains the data for
   * that event.
   *
   * @param {string} eventName The name of the event.
   * @param {function(*)} callback The function to call when the event fires.
   * @return {void}
   */
  on(eventName, callback) {
    if (!eventName) {
      throw new HubstairsError('You must pass an event name.', 'TypeError')
    }

    if (!callback) {
      throw new HubstairsError('You must pass a callback function.', 'TypeError')
    }

    if (typeof callback !== 'function') {
      throw new HubstairsError('The callback must be a function.', 'TypeError')
    }

    const callbacks = getCallbacks(this, `event:${eventName}`)
    if (callbacks.length === 0) {
      this.callMethod('addEventListener', eventName).catch(() => {
        // Ignore the error. There will be an error event fired that
        // will trigger the error callback if they are listening.
      })
    }

    storeCallback(this, `event:${eventName}`, callback)
  }

  /**
   * Remove an event listener for the specified event. Will remove all
   * listeners for that event if a `callback` isn’t passed, or only that
   * specific callback if it is passed.
   *
   * @param {string} eventName The name of the event.
   * @param {function} [callback] The specific callback to remove.
   * @return {void}
   */
  off(eventName, callback) {
    if (!eventName) {
      throw new HubstairsError('You must pass an event name.', 'TypeError')
    }

    if (callback && typeof callback !== 'function') {
      throw new HubstairsError('The callback must be a function.', 'TypeError')
    }

    const lastCallback = removeCallback(this, `event:${eventName}`, callback)

    // If there are no callbacks left, remove the listener
    if (lastCallback) {
      this.callMethod('removeEventListener', eventName).catch(() => {
        // Ignore the error. There will be an error event fired that
        // will trigger the error callback if they are listening.
      })
    }
  }

  /**
   * A promise to perform an action when the Display is ready.
   *
   * @todo document errors
   * @promise LoadDisplayPromise
   * @fulfill {void}
   */
  /**
   * Trigger a function when the display iframe has initialized. You do not
   * need to wait for `ready` to trigger to begin adding event listeners
   * or calling other methods.
   *
   * @return {ReadyPromise}
   */
  ready() {
    const readyPromise =
      readyMap.get(this) ||
      new Promise((resolve, reject) => {
        reject(new HubstairsError('Unknown display. Probably unloaded.'))
      })
    return Promise.resolve(readyPromise)
  }

  /**
   * Cleanup the display and remove it from the DOM
   *
   * It won't be usable and a new one should be constructed
   *  in order to do any operations.
   *
   * @return {Promise}
   */
  destroy() {
    return new Promise(resolve => {
      readyMap.delete(this)
      displayMap.delete(this.element)

      if (this._originalElement) {
        displayMap.delete(this._originalElement)
        this._originalElement.removeAttribute('data-hubstairs-initialized')
        this._originalElement.innerHTML = ''
      }

      if (this.element && this.element.nodeName === 'IFRAME' && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element)
      }
      this._window.removeEventListener('message', this._onMessage)

      resolve()
    })
  }

  /**
   * A promise to get the products displayed.
   *
   * @promise GetProductssPromise
   * @fulfill {HubstairsProduct[]} The products displayed.
   * @reject {Error} Cannot get the list of products
   */
  /**
   * Get an array of the products displayed.
   *
   * @return {getProductPromise}
   */
  getProducts() {
    return this.get('products')
  }

  /**
   * A promise to display the next scene
   *
   * @promise NextScenePromise
   * @fulfill {void} The next scene is displayed.
   * @reject {nextSceneError} No next scene available
   */
  /**
   * Display the nextScene if it's available
   *
   * @return {NextScenePromise}
   */
  nextScene(cursor) {
    return this.callMethod('nextScene', { cursor })
  }

  /**
   * A promise to set the filter
   *
   * @promise setFilterPromise
   * @fulfill {void} The filter is set.
   * @reject {setFilterError} Invalid filter
   */
  /**
   * Set or unset a filter
   *
   * @return {SetFilterPromise}
   */
  setFilter(filter) {
    return this.set('setFilter', filter)
  }

  /**
   * A promise to set dynamically the language.
   *
   * @promise setLanguagePromise
   * @fulfill {void} The language is set.
   * @reject {configError} Error while setting the language
   */
  /**
   * Update the language
   *
   * @param {String} language
   * @return {SetLanguagePromise}
   */
  setLanguage(config) {
    return this.set('language', config)
  }

  /**
   * A promise to set dynamically the configuration.
   *
   * @promise SetConfigPromise
   * @fulfill {void} The configuration is set.
   * @reject {configError} Error while setting configuration
   */
  /**
   * Update the configuration
   *
   * @param {Config} config
   * @return {SetConfigPromise}
   */
  setConfig(config) {
    return this.set('config', config)
  }
}

// Setup embed only if this is not a node environment
if (!isNode) {
  initializeEmbeds()
  resizeEmbeds()
}

export default Display
