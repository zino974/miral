import React, {Component} from 'react';
//UI
import Toolbar from './ui/toolbar';
import Altimeter from './ui/altimeter';
import TextEditor from './ui/textEditor';
import ElementEditor from './ui/elementEditor';
import Resizer from './ui/resizer';
import NavBar from './ui/navbar';
import BoardControls from './ui/boardControls';

//ELEMENTS
import Rect from './elements/rect';
import Text from './elements/text';
import PostitSquare from './elements/postit_square';

import './styles.css';

const rfc6902 = require('rfc6902');

class Board extends Component {

    constructor(props, context) {
      super(props, context);
      this.state = {
        zoomLevel : 100,
        offsetX : 0,
        offsetY : 0,
        tool : "pan",
        resetTool : false,
        dragging : false,
        dragStartX :  0,
        dragStartY : 0,
        dragStartHandler : null,
        dragMoveHandler : null,
        dragEndHandler : null,
        elements : {},
        elementState : {},
        currentElement : [],
        textEditor : null,
        storeUndo : false,
        undo : [],
        redo : [],
        updates : []
      };
    }
  
    handleToolSelect = (type) => {
      this.setState({"tool" : type});
    }

    handleZoom = (e) => {
        const {
            offsetX,
            offsetY,
            zoomLevel
        } = this.state;

        const dir = Math.sign(e.deltaY),
        nextZoomLevel = zoomLevel + dir > 0 ? zoomLevel + dir : 1,
        currentCursorPositionX = e.clientX*zoomLevel,
        currentCursorPositionY = e.clientY*zoomLevel,
        cursorPositionXAfterZoom = e.clientX*nextZoomLevel,
        cursorPositionYAfterZoom = e.clientY*nextZoomLevel,
        newOffsetX = offsetX - (cursorPositionXAfterZoom - currentCursorPositionX),
        newOffsetY = offsetY - (cursorPositionYAfterZoom - currentCursorPositionY);

        this.setState({
            offsetX : newOffsetX,
            offsetY : newOffsetY,
            zoomLevel : nextZoomLevel
        });

    }

    handleMouseDown = (e) => {
       
        const newState = {
            dragging : true,
            dragStartX : e.clientX,
            dragStartY : e.clientY,
        };

        let stateUpdate = {};
        if(this.state.dragStartHandler) {
            stateUpdate = this.state.dragStartHandler(e, this.state);
        }

        const finalNewState = Object.assign({}, newState, stateUpdate);

        this.setState(finalNewState);
        
    }

    handleMouseMove = (e) => {
        const {
            offsetX,
            offsetY,
            zoomLevel,
            dragging,
            tool,
            dragMoveHandler
        } = this.state;
        if(dragging) {
            let newState = {};
            if(dragMoveHandler) {
                newState = dragMoveHandler(e, this.state);
            } else if(tool === "pan") {
                newState = {
                    offsetX : offsetX + (e.movementX*-zoomLevel),
                    offsetY : offsetY + (e.movementY*-zoomLevel)
                };
            }
            this.setState(newState);
        }
    }

    handleMouseUp = (e) => {
        const newState = {
            dragging : false,
            dragStartX : 0,
            dragStartY : 0,
            currentElement : null,
            elementState : {...this.state.elementState}
        };

        let stateUpdate = {};
        if(this.state.dragEndHandler) {
            stateUpdate = this.state.dragEndHandler(e, this.state);
        }

        const finalState = Object.assign({}, newState, stateUpdate);

        this.setState(finalState);
    }

    handleTextEdit = (id) => {
        const newElements = {...this.state.elements};
        const elementData = {...this.state.elements[id]};
        const clearTextInRealElement = newElements[id].text = "";
        this.setState({textEditor : elementData, elements : newElements});
    }

    handleUpdatedText = (data) => {
        const newElementsData = {...this.state.elements};
        newElementsData[data.id].text = data.newText;
        newElementsData[data.id].styles.fontSize = data.fontSize*this.state.zoomLevel;
        newElementsData[data.id].unScaledFontSize = data.fontSize;
        newElementsData[data.id].padding = 8*this.state.zoomLevel;
        
        this.setState({
            elements : newElementsData,
            textEditor : null
        });
    }

    handleUpdatePosition = (data) => {
        const newElementsData = {...this.state.elements};
        const selectedItems = Object.keys(this.state.elementState).filter(item => {
            if(this.state.elementState[item].selected) {
                return true;
            }
            return false;
        });
        selectedItems.forEach(element => {
            newElementsData[element].styles.x += data.x*this.state.zoomLevel;
            newElementsData[element].styles.y += data.y*this.state.zoomLevel;
        });
        this.setState({
            elements : newElementsData
        });
    }

    handleSetCurrentElement = (elementID, selected, isMultiSelect) => {
        const newElementStateData = {...this.state.elementState};
        if(!isMultiSelect) {
            Object.keys(newElementStateData).forEach(item => {
                newElementStateData[item].selected = false;
            });
        }
        newElementStateData[elementID].selected = selected;
        this.setState({
            elementState : newElementStateData
        });
    };

    handleSetDragHandler = (newState) => {
        this.setState(newState);
    };

    handleSetElementHeight = (elementID, height) => {
        const newElementsData = {...this.state.elements};
        newElementsData[elementID].styles.height = Number(height)*this.state.zoomLevel;
        this.setState(newElementsData);
    };

    handleUpdateElementProperty = (data) => {
        const newElementsData = {...this.state.elements};
        newElementsData[data.id][data.property] = data.value;
        this.setState(newElementsData);
    }

    handleUndo = () => {

        const newUndo = [...this.state.undo];
        const newUpdates = [...this.state.updates];
        const lastUndoAction = newUndo.pop();
        const lastUpdateAction = newUpdates.pop();
        const newRedo = [...this.state.redo, lastUpdateAction];
        
        const newCombinedData = {
            elements : {...this.state.elements},
            elementState : {...this.state.elementState} 
        };
  
        rfc6902.applyPatch(newCombinedData, lastUndoAction);
        this.setState({
            elementState :  newCombinedData.elementState,
            elements : newCombinedData.elements,
            undo : newUndo,
            redo : newRedo,
            updates : newUpdates
        });
    }

    handleRedo = () => {
        const newRedo = [...this.state.redo];
        const lastRedoAction = newRedo.pop();
        
        const newCombinedData = {
            elements : {...this.state.elements},
            elementState : {...this.state.elementState} 
        };
        
        rfc6902.applyPatch(newCombinedData, lastRedoAction);

        this.setState({
            elementState :  newCombinedData.elementState,
            elements : newCombinedData.elements,
            redo : newRedo,
            storeUndo : true
        });
    }
  
    render() {
        const {width, height} = this.props;
        const {offsetX, offsetY, zoomLevel, tool, elements, textEditor} = this.state;
        const zoomedWidth = width*zoomLevel,
        zoomedHeight = height*zoomLevel;
        const viewBox = `${offsetX} ${offsetY} ${zoomedWidth} ${zoomedHeight}`;
        const elementNodes = Object.keys(elements).map(elementID => {
            const element = elements[elementID];
            if(element.type === "circle") {
                return (<circle
                            key={element.id} 
                            {...element.styles}
                            style={{cursor: "pointer"}} 
                    />);
            } else if (element.type === "rect") {
                return (<Rect 
                    key={element.id}
                    data={element}
                    elementState={this.state.elementState[element.id]}
                    handleTextEdit={this.handleTextEdit}
                    handleUpdatePosition={this.handleUpdatePosition}
                    handleSetCurrentElement={this.handleSetCurrentElement}
                />);
            } else if (element.type === "text") {
                return (<Text 
                    key={element.id}
                    data={element}
                    elementState={this.state.elementState[element.id]}
                    handleTextEdit={this.handleTextEdit}
                    handleUpdatePosition={this.handleUpdatePosition}
                    handleSetCurrentElement={this.handleSetCurrentElement}
                />);
            } else if (element.type === "postit_square") {
                return (<PostitSquare
                    key={element.id}
                    data={element}
                    elementState={this.state.elementState[element.id]}
                    handleTextEdit={this.handleTextEdit}
                    handleUpdatePosition={this.handleUpdatePosition}
                    handleSetCurrentElement={this.handleSetCurrentElement}
                />);
            }
            return null;
        });
        const selectedElements = [];
        Object.keys(this.state.elementState).forEach(item => {
            if(this.state.elementState[item].selected) {
                selectedElements.push(this.state.elements[item]);
            }
        });
        const gridPosition = {
            backgroundPosition : `${(offsetX*-1)/zoomLevel}px ${(offsetY*-1)/zoomLevel}px`
        };
        return (
            <div className={`boardWrapper ${tool}`} style={gridPosition}>
                <NavBar />
                <Altimeter zoomLevel={zoomLevel} />
                <BoardControls
                    undoIsPossible={this.state.undo.length > 0}
                    redoIsPossible={this.state.redo.length > 0} 
                    handleUndo={this.handleUndo}
                    handleRedo={this.handleRedo}
                />
                <Toolbar 
                    handleToolSelect={this.handleToolSelect} 
                    handleSetDragHandler={this.handleSetDragHandler}
                />
                <TextEditor 
                    data={textEditor}
                    gridSpace={{offsetX, offsetY, zoomLevel}}
                    handleUpdatedText={this.handleUpdatedText}
                    handleSetElementHeight={this.handleSetElementHeight}
                />
                <ElementEditor 
                    selectedElements={selectedElements}
                    gridSpace={{offsetX, offsetY, zoomLevel}}
                    handleUpdateElementProperty={this.handleUpdateElementProperty}
                />
                <svg id="board" 
                    width={`${width}px`}
                    height={`${height}px`}
                    viewBox={viewBox}
                    onWheel={this.handleZoom}
                    onMouseDown={this.handleMouseDown}
                    onMouseMove={this.handleMouseMove}
                    onMouseUp={this.handleMouseUp}
                    >
                    <defs>
                        <filter height="200%" id="shadow1" width="200%" x="-50%" y="-50%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="20"/>
                        </filter>
                        <filter height="200%" id="shadow2" width="200%" x="-50%" y="-50%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="10"/>
                        </filter>
                    </defs>
                    {elementNodes}
                    <Resizer 
                        selectedElements={selectedElements}
                        handleSetDragHandler={this.handleSetDragHandler}
                    />
                </svg>
            </div>
        );
    }

    componentDidUpdate(prevProps, prevState) {
        const prevCombinedData = {
            elements : prevState.elements,
            elementState : prevState.elementState 
        };
        const currentCombinedData = {
            elements : this.state.elements,
            elementState : this.state.elementState 
        };
        const elementsDiffUpdates = rfc6902.createPatch(prevCombinedData, currentCombinedData);
        const elementsDiffUndo = rfc6902.createPatch(currentCombinedData, prevCombinedData);
        if(elementsDiffUndo.length > 0 && elementsDiffUpdates.length > 0 && this.state.storeUndo) {
            this.setState({
                undo : [...this.state.undo, elementsDiffUndo],
                updates : [...this.state.updates, elementsDiffUpdates],
                storeUndo : false
            });
        }
    }

    
  }

  export default Board;