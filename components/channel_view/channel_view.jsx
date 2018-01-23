// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import $ from 'jquery';

import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import * as Utils from 'utils/utils.jsx';

import * as UserAgent from 'utils/user_agent.jsx';
import deferComponentRender from 'components/deferComponentRender';

import ChannelHeader from 'components/channel_header';
import CreatePost from 'components/create_post';
import FileUploadOverlay from 'components/file_upload_overlay.jsx';
import PostView from 'components/post_view';
import TutorialView from 'components/tutorial/tutorial_view.jsx';
import {clearMarks, mark, measure, trackEvent} from 'actions/diagnostics_actions.jsx';

import CreatePostPharo from 'components/create_post_pharo';
import CreatePostPharoTweet from 'components/create_post_pharo_tweet';

export default class ChannelView extends React.PureComponent {
    static propTypes = {

        /**
         * ID of the channel to display
         */
        channelId: PropTypes.string.isRequired,

        /**
         * Set if this channel is deactivated, primarily used for DMs with inactive users
         */
        deactivatedChannel: PropTypes.bool.isRequired,

        /**
         * Set to show the tutorial
         */
        showTutorial: PropTypes.bool.isRequired
    };

    constructor(props) {
        super(props);
        this.createDeferredPostView();

        this.postUI = (<div className='post-create__container' id='post-create'><CreatePost getChannelView={this.getChannelView}/></div>);
        this.postUIPharo = (<div className='post-create__container' id='post-create'><CreatePostPharo getChannelView={this.getChannelView}/></div>);
        this.postUIPharoTweet = (<div className='post-create__container' id='post-create'><CreatePostPharoTweet getChannelView={this.getChannelView}/></div>);
        this.isPharoPostUI = false;
        this.isPharoPostUITweet = false;
        this.isPharoPostUITweetInput = false; 
    }

    createDeferredPostView = () => {
        this.deferredPostView = deferComponentRender(
            PostView,
            <div id='post-list'/>
        );
    }

    componentDidMount() {
        $('body').addClass('app__body');

        // IE Detection
        if (UserAgent.isInternetExplorer() || UserAgent.isEdge()) {
            $('body').addClass('browser--ie');
        }

        // pharo custom ui injection
        if(this.props.params.channel === 'market-commentary')
            this.isPharoPostUI = true;
        if(this.props.params.channel === 'tweets')
            this.isPharoPostTweetUI = true;            
    }

    componentWillUnmount() {
        $('body').removeClass('app__body');
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.channelId !== nextProps.channelId) {
            this.createDeferredPostView();
        }

        // pharo custom ui injection on channel change
        if (!Utils.areObjectsEqual(nextProps.params, this.props.params)) {
            if(nextProps.params.channel === 'market-commentary')
            {
                this.isPharoPostUI = true;
                this.isPharoPostUITweet = false;
                this.isPharoPostUITweetInput = false;
            }
            else if(nextProps.params.channel === 'tweets')
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
        }
        else
        {
            if(nextProps.params.channel === 'market-commentary') {
                this.isPharoPostUI = true;
                this.isPharoPostUITweet = false;
                this.isPharoPostUITweetInput = false;                
            }
            else if(nextProps.params.channel === 'tweets') {                
                this.isPharoPostUI = false;
                this.isPharoPostUITweet = true;
                this.isPharoPostUITweetInput = false;                
            }        
            else if(nextProps.params.channel.indexOf('tweets-') != -1) {                
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
        }
    }

    getChannelView = () => {
        return this.refs.channelView;
    }

    componentDidUpdate(prevProps) {
        if (prevProps.channelId !== this.props.channelId) {
            mark('ChannelView#componentDidUpdate');

            const [dur1] = measure('SidebarChannelLink#click', 'ChannelView#componentDidUpdate');
            const [dur2] = measure('TeamLink#click', 'ChannelView#componentDidUpdate');

            clearMarks([
                'SidebarChannelLink#click',
                'ChannelView#componentDidUpdate',
                'TeamLink#click'
            ]);

            if (dur1 !== -1) {
                trackEvent('performance', 'channel_switch', {duration: Math.round(dur1)});
            }
            if (dur2 !== -1) {
                trackEvent('performance', 'team_switch', {duration: Math.round(dur2)});
            }
        }        
    }

    render() {
        if (this.props.showTutorial) {
            return (
                <TutorialView
                    isRoot={false}
                />
            );
        }

        let createPost;
        if (this.props.deactivatedChannel) {
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
        } else {
            createPost = (
                <div
                    className='post-create__container'
                    id='post-create'
                >
                    <CreatePost
                        getChannelView={this.getChannelView}
                    />
                </div>
            );
        }

        const DeferredPostView = this.deferredPostView;

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
                    channelId={this.props.channelId}
                />
                <DeferredPostView
                    channelId={this.props.channelId}
                />
                {postUI}
            </div>
        );
    }
}
