import {h, render} from 'preact'
import {ApplicationContainer} from './views/application-container'
import {ThemeProvider} from './views/themes/theme'

console.log(`speedscope v${require('../package.json').version}`)

const useFullViewportStyles = {
  width: '100vw',
  height: '100vh',
}

/*
TODO(jlfwong): Fix this
declare const module: any
if (module.hot) {
  module.hot.dispose(() => {
    // Force the old component go through teardown steps
    render(<div />, document.body, document.body.lastElementChild || undefined)
  })
  module.hot.accept()
}
*/

render(
  <div style={useFullViewportStyles}>
    <ThemeProvider>
      <ApplicationContainer />
    </ThemeProvider>
  </div>,
  document.body,
  document.body.lastElementChild || undefined,
)
