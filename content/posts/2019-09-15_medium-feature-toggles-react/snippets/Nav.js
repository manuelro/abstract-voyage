import React from 'react'

// components
import Item from '../Item'
import ToggleRouter from '../ToggleRouter'

// data
import nav from '../../data/nav'

export default () => {
  return (
    <nav>
      <ul>
        {nav.items.map((item, index) => (
          <ToggleRouter
            toggleName={item.toggleName}
            toggles={item.toggles}
            offFallback={null}
            key={index}
          >
            <li><Item {...item}/></li>
          </ToggleRouter>
        ))}
      </ul>
    </nav>
  )
}
