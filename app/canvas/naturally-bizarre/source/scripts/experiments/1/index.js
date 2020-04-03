import { randomInt } from '../../lib/random'

import Experiments from '../../classes/Experiments'
import Walker from './Walker'

export default class Root extends Experiments {
  constructor () {
    super()

    this.walkers = null
    this.walkersLength = null
    this.walkersColor = null

    this.createWalkers()

    this.update()
  }

  createWalker () {
    const color = this.colors[this.walkersColor][randomInt(0, this.colors.length - 1)]
    const x = randomInt(0, window.innerWidth)
    const y = randomInt(0, window.innerHeight)

    const walker = new Walker(color, x, y)

    this.walkers.push(walker)
  }

  createWalkers () {
    this.walkers = []
    this.walkersLength = 2500
    this.walkersColor = randomInt(0, this.colors.length - 1)

    for (let i = 0; i <= this.walkersLength; i++) {
      this.createWalker()
    }
  }

  update () {
    super.update()

    this.stats.begin()

    this.walkers.forEach(walker => walker.draw(this.context))

    this.context.globalAlpha = 0.1
    this.context.globalCompositeOperation = 'lighter'

    this.stats.end()
  }

  dblclick () {
    super.dblclick()

    this.createWalkers()
  }

  resize () {
    super.resize()

    this.createWalkers()
  }
}
