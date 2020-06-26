import { callbackMap, storeCallback, getCallbacks, removeCallback, shiftCallbacks, swapCallbacks } from './callbacks'

describe('storeCallback', () => {
  test('adds the callback when the name doesn’t exist', () => {
    const display = {
      element: {},
    }

    const cb = () => {}

    storeCallback(display, 'test', cb)
    expect(callbackMap.get(display.element)).toHaveProperty('test')
    expect(callbackMap.get(display.element).test).toBeInstanceOf(Array)
    expect(callbackMap.get(display.element).test[0]).toBe(cb)
  })

  test('adds the callback when the name already exists', () => {
    const display = {
      element: {},
    }

    const cb = () => {}
    const cb2 = () => {}

    storeCallback(display, 'test', cb)
    storeCallback(display, 'test', cb2)
    expect(callbackMap.get(display.element).test).toHaveLength(2)
    expect(callbackMap.get(display.element).test[1]).toBe(cb2)
  })
})

describe('getCallbacks', () => {
  test('returns an empty array when there are no callbacks', () => {
    expect(getCallbacks({ element: {} }, 'test')).toEqual([])
  })

  test('returns the callbacks', () => {
    const display = {
      element: {},
    }

    const cb = () => {}

    callbackMap.set(display.element, { test: [cb] })
    expect(getCallbacks(display, 'test')).toEqual([cb])
  })
})

describe('removeCallback', () => {
  test('does nothing if there are no callbacks', () => {
    expect(removeCallback({ element: {} }, 'test')).toBe(true)
  })

  test('removes all callbacks without a callback arg', () => {
    const display = {
      element: {},
    }

    const cb = () => {}
    const cb2 = () => {}

    callbackMap.set(display.element, { test: [cb, cb2] })
    expect(removeCallback(display, 'test')).toBe(true)
    expect(callbackMap.get(display.element)).toEqual({ test: [] })
  })

  test('removes just the callback specified', () => {
    const display = {
      element: {},
    }

    const cb = () => {}
    const cb2 = () => {}

    callbackMap.set(display.element, { test: [cb, cb2] })
    expect(removeCallback(display, 'test', cb2)).toBe(false)
    expect(callbackMap.get(display.element)).toEqual({ test: [cb] })
  })

  test('does nothing if the callback passed isn’t in the map', () => {
    const display = {
      element: {},
    }

    const cb = () => {}
    const cb2 = () => {}

    callbackMap.set(display.element, { test: [cb] })
    expect(removeCallback(display, 'test', cb2)).toBe(false)
    expect(callbackMap.get(display.element)).toEqual({ test: [cb] })
  })
})

describe('shiftCallbacks', () => {
  test('shifts a single callback from the callback array', () => {
    const display = {
      element: {},
    }

    const cb = () => {}
    const cb2 = () => {}

    callbackMap.set(display.element, { test: [cb, cb2] })

    expect(shiftCallbacks(display, 'test')).toBe(cb)

    const callbacks = getCallbacks(display, 'test')
    expect(callbacks).toHaveLength(1)
    expect(callbacks[0]).toBe(cb2)
  })

  test('returns false when there are no callbacks', () => {
    const display = {
      element: {},
    }

    callbackMap.set(display.element, { test: [] })
    expect(shiftCallbacks(display, 'test')).toBe(false)
  })
})

describe('swapCallbacks', () => {
  test('moves the callbacks from one key to another', () => {
    const oldElement = {}
    const newElement = {}
    const cb = () => {}

    callbackMap.set(oldElement, { test: [cb] })
    swapCallbacks(oldElement, newElement)

    expect(callbackMap.get(oldElement)).toBeUndefined()
    expect(callbackMap.get(newElement)).toEqual({ test: [cb] })
  })
})
