// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import $ from 'jquery';

import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';

import ChannelStore from 'stores/channel_store.jsx';
import PreferenceStore from 'stores/preference_store.jsx';
import UserStore from 'stores/user_store.jsx';

import Constants from 'utils/constants.jsx';
import * as UserAgent from 'utils/user_agent.jsx';
import * as Utils from 'utils/utils.jsx';

import ChannelHeader from 'components/channel_header';
import CreatePost from 'components/create_post';
import FileUploadOverlay from 'components/file_upload_overlay.jsx';
import CreatePostPharo from 'components/create_post_pharo.jsx';
import CreatePostPharoTweet from 'components/create_post_pharo_tweet.jsx';
import PostView from 'components/post_view';
import TutorialView from 'components/tutorial/tutorial_view.jsx';

const TutorialSteps = Constants.TutorialSteps;
const Preferences = Constants.Preferences;

export default class ChannelView extends React.Component {
    constructor(props) {
        super(props);

        this.getStateFromStores = this.getStateFromStores.bind(this);
        this.isStateValid = this.isStateValid.bind(this);
        this.updateState = this.updateState.bind(this);

        this.state = this.getStateFromStores(props);

        this.postUI = (<div className='post-create__container' id='post-create'><CreatePost getChannelView={this.getChannelView}/></div>);
        this.postUIPharo = (<div className='post-create__container' id='post-create'><CreatePostPharo getChannelView={this.getChannelView}/></div>);
        this.postUIPharoTweet = (<div className='post-create__container' id='post-create'><CreatePostPharoTweet getChannelView={this.getChannelView}/></div>);
        this.isPharoPostUI = false;
        this.isPharoPostUITweet = false;
        this.isPharoPostUITweetInput = false;
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
        if(this.props.params.channel.indexOf('tweets-') != -1)
            this.isPharoPostUITweetInput = true;                    
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
            {
                this.isPharoPostUI = true;
                this.isPharoPostUITweet = false;
                this.isPharoPostUITweetInput = false;
            }
            if(nextProps.params.channel === 'tweets')
            {
                this.isPharoPostUI = false;
                this.isPharoPostUITweet = true;
                this.isPharoPostUITweetInput = false;
            }            
            else if(nextProps.params.channel.indexOf('tweets-') != -1)
            {
                this.isPharoPostUI = false;
                this.isPharoPostUITweet = false;                
                this.isPharoPostUITweetInput = true;
            }
            else
            {
                this.isPharoPostUI = false;
                this.isPharoPostUITweet = false;
                this.isPharoPostUITweetInput = false;
            }

            return true;
        }
        if(nextProps.params.channel === 'market-commentary') {
            this.isPharoPostUI = true;
            return true;
        }
        if(nextProps.params.channel === 'tweets') {
            this.isPharoPostUITweet = true;
            return true;
        }        
        if(nextProps.params.channel.indexOf('tweets-') != -1) {
            this.isPharoPostUITweetInput = true;
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
        if (this.state.tutorialStep <= TutorialSteps.INTRO_SCREENS) {
            return (
                <TutorialView
                    isRoot={false}
                />
            );
        }

        let createPost = (
            <div
                className='post-create__container'
                id='post-create'
            >
                <CreatePost
                    getChannelView={this.getChannelView}
                />
            </div>
        );
        const channel = ChannelStore.get(this.state.channelId);
        if (channel.type === Constants.DM_CHANNEL) {
            const teammate = Utils.getDirectTeammate(channel.id);
            if (teammate && teammate.delete_at) {
                createPost = (
                    <div
                        className='post-create-message'
                    >
                        <FormattedMessage
                            id='create_post.deactivated'
                            defaultMessage='You are viewing an archived channel with a deactivated user.'
                        />
                    </div>
                );
            }
        }

        let postUI = createPost;
        if(this.isPharoPostUI)
            postUI = this.postUIPharo;
        if(this.isPharoPostUITweetInput)
            postUI = this.postUIPharoTweet;
        if(this.isPharoPostUITweet)
            postUI = (<div />);

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
                {postUI}
            </div>
        );
    }
}
ChannelView.defaultProps = {
};

ChannelView.propTypes = {
    params: PropTypes.object.isRequired
};
