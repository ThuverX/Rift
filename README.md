![Rift](https://media.discordapp.net/attachments/179642073048285185/755009463580229632/riftname.png)

RiftHTML is an easy to use (and experimental) component based dom renderer.
Rift has an easy to use component system. You just create components and Rift handles the rest. No annoying state or super constructors. You can focus on programming your application instead of fighting with other frameworks.

Rift works in plain Javascript and doesn't need any preprocessing to work, or be manageable. This is thanks to Rift's easy to use `r` (Shortcut) template strings!

# Usage

Creating components is easy in Rift. Just extend Component, there is no need to register your component.
Any time you use the component inside another component Rift with automagically use the right component.
State isn't some annoying object or function. You just define your variables inside the custom constructor and anytime they are updated, the component updates.

Things to keep note of:
- You can't use the normal constructor inside a component class. Instead use the class name for the constructor. (You also don't need to use `super()`)
- You must define your state inside the custom constructor for it to trigger a re-render when updated
- The render method must be defined and must return a `RiftElement`

```js
class ExampleComponent extends Component {

    ExampleComponent() {
        this.isClicked = false
    }

    onClick() {
        this.isClicked = !this.isClicked
    }

    render() {
        return r`
        <div>
            <a>This is a component!</a>
            <button onclick="${this.onClick.bind(this)}">${this.isClicked ? 'Clicked' : 'Not clicked'}</button>
        </div>`
    }
}
```

To start rendering your components call `Rift.root` passing in your dom root element and your main component.

For a full example check [example.js](https://github.com/ThuverX/RiftHTML/blob/master/example.js)

# <a style="color:#FF4136">This framework is still a Work In Progress. Don't expect everything to work as intended.</a>

Created by ThuverX with 🧡 and ☕