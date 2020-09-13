class ClickComponent extends Component {
    ClickComponent() {
        this.clicked = false
    }

    onClick() {
        this.clicked = !this.clicked
    }

    render() {
        return rhtml`
        <div classlist="${[this.clicked && 'red']}" onclick='${this.onClick.bind(this)}'>
            <b>yeeeeee</b>
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

RiftHTML.renderRoot(document.querySelector('app'), new App())