import React, { Component } from 'react'
import { withLDConsumer } from 'launchdarkly-react-client-sdk'

export default function(WrappedComponent) {
  const WrappedComponentAsTogglesConsumer
    = withLDConsumer()(WrappedComponent)

  return class extends Component {
    render() {
      return <WrappedComponentAsTogglesConsumer {...this.props} />
    }
  }
}
