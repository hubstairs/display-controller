import { prefix } from './logger'
/**
 * @module lib/functions
 */

/**
 * Check to see this is a node environment.
 * @type {Boolean}
 */
export const isNode = typeof global !== 'undefined' && {}.toString.call(global) === '[object global]'

export class HubstairsError extends Error {
  constructor(message, name) {
    super(`${prefix} ${message}`)
    if (name) {
      this.name = name
    }
  }
}

/**
 * Get the name of the method for a given getter or setter.
 *
 * @param {string} prop The name of the property.
 * @param {string} type Either “get” or “set”.
 * @return {string}
 */
export function getMethodName(prop, type) {
  if (prop.indexOf(type.toLowerCase()) === 0) {
    return prop
  }

  return `${type.toLowerCase()}${prop.substr(0, 1).toUpperCase()}${prop.substr(1)}`
}

/**
 * Check to see if the object is a DOM Element.
 *
 * @param {*} element The object to check.
 * @return {boolean}
 */
export function isDomElement(element) {
  return Boolean(
    element &&
      element.nodeType === 1 &&
      'nodeName' in element &&
      element.ownerDocument &&
      element.ownerDocument.defaultView,
  )
}

export function isObjectId(value) {
  return /^[a-fA-F0-9]{24}$/.test(value)
}

/**
 * Check to see if the URL is a Hubstairs url.
 *
 * @param {string} url The url string.
 * @return {boolean}
 */
export function isHubstairsUrl(url) {
  return /^(https?:)?\/\/display.*(hubstairs\.io|hubstairs\.com|nfinite\.app)(:\d+)?(?=$|\/)/.test(url)
}

/**
 * Get the Hubstairs URL from an element.
 *
 * @param {object} oEmbedParameters The oEmbed parameters.
 * @return {string}
 */
export function getHubstairsUrl({ url, displayid, displayUrl } = {}) {
  const idOrUrl = displayid || url

  if (!idOrUrl) {
    throw new HubstairsError('An id or url must be passed, either in an options object')
  }

  if (isObjectId(idOrUrl)) {
    return `${displayUrl || 'https://display.nfinite.app'}/v1/${idOrUrl}`
  }

  if (isHubstairsUrl(idOrUrl)) {
    return idOrUrl.replace('http:', 'https:')
  }

  if (displayid) {
    throw new HubstairsError(`“${displayid}” is not a valid display id.`, 'TypeError')
  }

  throw new HubstairsError(`“${idOrUrl}” is not a display.nfinite.app url.`, 'TypeError')
}
