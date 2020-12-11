import React, {Component} from 'react';

import './styles.css';

class SlideListItem extends Component {

    handleJumpToSlide = () => {
        this.props.handleJumpToSlide(this.props.slideID, this.props.slideNumber);
    }

    render() {
        return (
            <div 
                key={`slideList_name_${this.props.slideNumber}`} 
                className={"slideList_name"}
                onClick={this.handleJumpToSlide}
            >Slide {this.props.slideNumber+1} - {this.props.slideName}</div>)
    }
}

class SlideNavigator extends Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            currentSlide : 0,
            slideNav : false
        };
    }

    handleSlideForward = () => {
        const {
            currentSlide
        } = this.state;

        const nextSlide = currentSlide+1;

        const slides = this.props.getSlides();

        const nextSlideID = slides[nextSlide].id;

        if(nextSlideID) {
            this.props.animateToElement(nextSlideID, 1);
            this.setState({currentSlide : nextSlide});
        } else {
            this.props.animateToElement(slides[currentSlide].id, 1);
        }

        
    } 

    handleSlideBackwards = () => {
        
        const {
            currentSlide
        } = this.state;

        const nextSlide = currentSlide-1;

        const slides = this.props.getSlides();

        const nextSlideID = slides[nextSlide].id;

        if(nextSlideID) {
            this.props.animateToElement(nextSlideID, 1);
            this.setState({currentSlide : nextSlide});
        } else {
            this.props.animateToElement(slides[currentSlide].id, 1);
        }

    }

    toggleSlideList = () => {
        this.setState({
            slideNav : !this.state.slideNav
        });
    }

    handleJumpToSlide = (slideID, slideNumber) => {
        this.props.animateToElement(slideID, 1);
        this.setState({currentSlide : slideNumber, slideNav : false});
    }
  
    render() {

        const {
            currentSlide,
            slideNav
        } = this.state;

        const slides = this.props.getSlides();

        const slidesPossible = slides.length > 0;

        const slidesNavStyles = {
            visibility : "visible"
        }

        if(!slidesPossible) {
            slidesNavStyles.visibility = "hidden";
        }
        //TOTEST : Buttons are disabled when user cannot go to next slide
        let slideBackwardsDisabled = "buttonDisabled";
        if(currentSlide !== 0) {
            slideBackwardsDisabled = "";
        }

        let slideForwardsDisabled = "buttonDisabled";
        if(currentSlide < slides.length-1) {
            slideForwardsDisabled = "";
        }

        const slideNavVisible = slideNav ? "dropDown_open" : "";

        const slideNames = slides.map((slide, i) => {
            return (
            <SlideListItem 
                key={`slideList_name_${i}`}
                slideNumber={i}
                slideName={slide.slideName}
                slideID={slide.id}
                handleJumpToSlide={this.handleJumpToSlide}
            />);
        });

        return (
            <div className={"undoControls"} style={slidesNavStyles}>
                <span 
                    className={`iconButton backward ${slideBackwardsDisabled}`}
                    onClick={this.handleSlideBackwards}
                />
                <span
                    className={`dropDown`}
                    onClick={this.toggleSlideList}
                >Slide {(this.state.currentSlide+1)} of {slides.length}
                </span>
                <span 
                    className={`iconButton forward ${slideForwardsDisabled}`}
                    onClick={this.handleSlideForward}
                />
                <div className={`slideList ${slideNavVisible}`}>
                    {slideNames}
                </div>
            </div>
        );
    }
    
  }

  export default SlideNavigator;