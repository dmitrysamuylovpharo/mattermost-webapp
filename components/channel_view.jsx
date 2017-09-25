// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import $ from 'jquery';
import PropTypes from 'prop-types';
import React from 'react';

import Constants from 'utils/constants.jsx';
import * as UserAgent from 'utils/user_agent.jsx';
import ChannelHeader from 'components/channel_header';
import FileUploadOverlay from 'components/file_upload_overlay.jsx';
import CreatePost from 'components/create_post.jsx';
import CreatePostPharo from 'components/create_post_pharo.jsx';
import PostView from 'components/post_view';
import TutorialView from 'components/tutorial/tutorial_view.jsx';
const TutorialSteps = Constants.TutorialSteps;
const Preferences = Constants.Preferences;

import ChannelStore from 'stores/channel_store.jsx';
import PreferenceStore from 'stores/preference_store.jsx';
import UserStore from 'stores/user_store.jsx';

import * as Utils from 'utils/utils.jsx';

export default class ChannelView extends React.Component {
    constructor(props) {
        super(props);

        this.getStateFromStores = this.getStateFromStores.bind(this);
        this.isStateValid = this.isStateValid.bind(this);
        this.updateState = this.updateState.bind(this);

        this.state = this.getStateFromStores(props);

        this.postUI = (<CreatePost getChannelView={this.getChannelView}/>);
        this.postUIPharo = (<CreatePostPharo getChannelView={this.getChannelView}/>);
        this.isPharoPostUI = false;         
    }

    getStateFromStores() {
        return {
            channelId: ChannelStore.getCurrentId(),
            tutorialStep: PreferenceStore.getInt(Preferences.TUTORIAL_STEP, UserStore.getCurrentId(), 999)
        };
    }

    isStateValid() {
        return this.state.channelId !== '';
    }

    updateState() {
        this.setState(this.getStateFromStores(this.props));
    }

    componentDidMount() {
        ChannelStore.addChangeListener(this.updateState);

        $('body').addClass('app__body');

        // IE Detection
        if (UserAgent.isInternetExplorer() || UserAgent.isEdge()) {
            $('body').addClass('browser--ie');
        }

        // pharo custom ui injection
        if(this.props.params.channel === 'market-commentary')
            this.isPharoPostUI = true;        
    }

    componentWillUnmount() {
        ChannelStore.removeChangeListener(this.updateState);

        $('body').removeClass('app__body');
    }

    componentWillReceiveProps(nextProps) {
        this.setState(this.getStateFromStores(nextProps));
    }

    shouldComponentUpdate(nextProps, nextState) {
        // pharo custom ui injection on channel change
        if (!Utils.areObjectsEqual(nextProps.params, this.props.params)) {
            if(nextProps.params.channel === 'market-commentary')
                this.isPharoPostUI = true;
            else
                this.isPharoPostUI = false;

            return true;
        }
        if(nextProps.params.channel === 'market-commentary') {
            this.isPharoPostUI = true;
            return true;
        }

        if (nextState.channelId !== this.state.channelId) {
            return true;
        }

        return false;
    }

    getChannelView = () => {
        return this.refs.channelView;
    }

    render() {
        let postUI = this.isPharoPostUI ? this.postUIPharo : this.postUI;

        if (this.state.tutorialStep <= TutorialSteps.INTRO_SCREENS) {
            return (
                <TutorialView
                    isRoot={false}
                />
            );
        }

        return (
            <div
                ref='channelView'
                id='app-content'
                className='app__content'
            >
                <FileUploadOverlay overlayType='center'/>
                <ChannelHeader
                    channelId={this.state.channelId}
                />
                <PostView
                    channelId={this.state.channelId}
                />
                <div
                    className='post-create__container'
                    id='post-create'
                >
                    {postUI}
                </div>
            </div>
        );
    }
}
ChannelView.defaultProps = {
};

ChannelView.propTypes = {
    params: PropTypes.object.isRequired
};
