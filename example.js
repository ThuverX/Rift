class ClickComponent extends Component {
    ClickComponent() {
        this.clicked = false
    }

    onClick() {
        this.clicked = !this.clicked
    }

    render() {
        return r`
        <div onclick='${this.onClick.bind(this)}' class="clicker">
            <b>${this.clicked ? 'Clicked!' : 'Not clicked!'}</b>
        </div>`
    }
}

class App extends Component {
    render() {
        return r`
        <div>
            <ClickComponent/>
        </div>`
    }
}

Rift.root(document.querySelector('app'), new App())