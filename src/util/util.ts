function Zip(a: any, b: any) {
    let arr = []
    for (let key in a) arr.push([a[key], b[key]])
    return arr
}

function MutliRegex(str: string, regex: RegExp, flags: string = '') : RegExpMatchArray[] {
    let matches: RegExpMatchArray = str.match(new RegExp(regex, 'g' + flags))
    if(!matches) return []
    return matches.map(str => str.match(new RegExp(regex, flags)))
}

class AssertionError extends Error {
    name = 'AssertionError'
}

function assert(statement: boolean, message: string) : void {
    if(!!statement) return

    throw new AssertionError(message)
}