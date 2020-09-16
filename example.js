class ClickComponent extends Component {
    ClickComponent() {
        this.clicked = false
    }

    onClick() {
        this.clicked = !this.clicked
    }

    render() {
        return rhtml`
        <div onclick='${this.onClick.bind(this)}'>
            <b>${this.clicked ? 'Clicked!' : 'Not clicked!'}</b>
        </div>`
    }
}

class App extends Component {
    render() {
        return rhtml`
        <div>
            <ClickComponent/>
        </div>`
    }
}

RiftHTML.renderRoot(document.querySelector('app'), App)