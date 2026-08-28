import React, { Component } from 'react'
import { withLDProvider } from 'launchdarkly-react-client-sdk'

export default function(WrappedComponent) {
  const WrappedComponentWithToggles = withLDProvider(
    {
      clientSideID: '5d7dc369f0cd9b07b24ad82r', // change this
      options: { streaming: true }
    }
  )(WrappedComponent)

  return class extends Component {
    render() {
      return <WrappedComponentWithToggles {...this.props} />
    }
  }
}
