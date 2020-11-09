enum TokenType {
    ClosedDomTag,
    OpeningDomTag,
    ClosingDomTag,
    Text
}

type TagType = [TokenType, RegExp, number]

const tokens: TagType[] = [
    [TokenType.ClosedDomTag, /<(?<TagName>(?:\w|-)+)(?: (?<Attributes>(?:[^<>]|\\.)+?)|)\/>/, 0],
    [TokenType.OpeningDomTag, /<(?<TagName>(?:\w|-)+)(?: (?<Attributes>(?:[^<>]|\\.)+?)|)>/, +1],
    [TokenType.ClosingDomTag, /<\/(?<TagName>(?:\w|-)+)>/, -1],
    [TokenType.Text, /(?<Value>(?:(?:\\.)|[^<>])+)/, 0]
]

interface ParserToken {
    tokenType: TokenType,
    beginIndex: number,
    endIndex: number,
    data: any,
    numIndex: number,
    depth: number
}

const attributeMatcher: RegExp = /(?<AttrKey>(?:\w|-)+)(?:=('|")(?<AttrValue>.+?|)(?:\2)|)/

function parseAttributes(inputString: string) : {[key:string]: any} {
    if(!inputString) return {}
    let results: RegExpMatchArray[]  = MutliRegex(inputString, attributeMatcher, 's')

    let attributesReturns: {[key:string]: any} = {}

    for(let res of results)
        attributesReturns[res.groups.AttrKey] = res.groups.AttrValue || ''

    return attributesReturns
}

function parse(inputString: string) : VirtualElement[] {
    assert(!!inputString, `Can't parse empty input InputString`)
    assert(inputString.length > 0, `InputString should be longer than one`)

    let outTokens: ParserToken[] = []

    let str: string = inputString.replace(/\n|\r/,'') || ''
    let index: number = 0
    let numIndex: number = 0
    let depth: number = 0

    while(str.length > 0) {
        let indexBefore = index
        for(let [tokenType, tokenMatcher, depthIncrementer] of tokens) {
            let match = str.match(tokenMatcher)
            if(match && match.index == 0) {
                str = str.substr(match[0].length).trim()

                outTokens.push({
                    tokenType,
                    beginIndex: index,
                    endIndex: index + match[0].length,
                    data: match.groups,
                    numIndex,
                    depth
                })
                
                depth += depthIncrementer
                
                index += match[0].length
            }
        }
        
        numIndex ++

        if(indexBefore == index) throw new Error('Tag did not get processed properly at index ' + index)
    }

    let group = (tokenList: ParserToken[]) : VirtualElement[] => {
        let returnElements: VirtualElement[] = []

        let currentElement: VirtualElement | null = null
        let currentToken: ParserToken | null = null
        let elementChildren: ParserToken[] = []

        for(let token of tokenList) {
            if(token.tokenType == TokenType.OpeningDomTag) {
                if(!currentElement) {
                    currentElement = {
                        type: token.data.TagName,
                        attributes: parseAttributes(token.data.Attributes),
                        children: []
                    }

                    currentToken = token
                } else if(currentToken.depth != token.depth) {
                    elementChildren.push(token)
                }
            } else if(token.tokenType == TokenType.ClosingDomTag) {
                if(currentElement && currentToken.depth == token.depth - 1) {
                    currentElement.children = group(elementChildren) || []

                    returnElements.push(currentElement)

                    currentElement = null
                    elementChildren = []

                    continue
                } else if(currentToken.depth != token.depth) {
                    elementChildren.push(token)
                }
            } else {
                if(currentElement && currentToken.depth != token.depth) {
                    elementChildren.push(token)
                } else {
                    if(token.tokenType == TokenType.ClosedDomTag) {
                        returnElements.push({
                            type: token.data.TagName,
                            attributes: this.parseAttributes(token.data.Attributes),
                            children: []
                        })
                    } else if(token.tokenType == TokenType.Text) {
                        returnElements.push({
                            type: 'Text',
                            value: token.data.Value
                        })
                    }

                    if(returnElements.length == tokenList.length)
                        continue
                }
            }
        }

        // if(currentElement) {
        //     let lines = inputString.split('\n')
        //     let lineIndex = 0
        //     let lineNumber = -1

        //     lines.map((line, i) => {
        //         if(lineNumber == -1 && currentToken.beginIndex >= lineIndex && currentToken.beginIndex < lineIndex + line.length) {
        //             lineNumber = i 
        //         } else {
        //             lineIndex += line.length
        //         }
        //     })
            
        //     throw new UnclosedHTMLElementError(lineNumber, lines[lineNumber])
        // }

        return returnElements
    }

    return group(outTokens)
}