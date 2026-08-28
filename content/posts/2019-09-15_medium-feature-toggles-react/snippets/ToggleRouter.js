import { Component } from 'react'

// hoc
import asTogglesConsumer from '../../hoc/asTogglesConsumer'

class ToggleRouter extends Component {
  render() {
    const { toggleName, flags, children, offFallback } = this.props

    return flags[toggleName] ? children : offFallback
  }
}

export default asTogglesConsumer(ToggleRouter)
