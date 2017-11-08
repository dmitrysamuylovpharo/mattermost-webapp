// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import ReactDOM from 'react-dom';
import MsgTyping from './msg_typing.jsx';
import Textbox from './textbox.jsx';
import FileUpload from './file_upload.jsx';
import FilePreview from './file_preview.jsx';
import PostDeletedModal from './post_deleted_modal.jsx';
import TutorialTip from './tutorial/tutorial_tip.jsx';
import EmojiPickerOverlay from 'components/emoji_picker/emoji_picker_overlay.jsx';
import * as EmojiPicker from 'components/emoji_picker/emoji_picker.jsx';

import AppDispatcher from 'dispatcher/app_dispatcher.jsx';
import * as GlobalActions from 'actions/global_actions.jsx';
import * as Utils from 'utils/utils.jsx';
import * as UserAgent from 'utils/user_agent.jsx';
import * as ChannelActions from 'actions/channel_actions.jsx';
import * as PostActions from 'actions/post_actions.jsx';

import ChannelStore from 'stores/channel_store.jsx';
import EmojiStore from 'stores/emoji_store.jsx';
import PostStore from 'stores/post_store.jsx';
import MessageHistoryStore from 'stores/message_history_store.jsx';
import UserStore from 'stores/user_store.jsx';
import PreferenceStore from 'stores/preference_store.jsx';
import ConfirmModal from './confirm_modal.jsx';

import Constants from 'utils/constants.jsx';
import * as FileUtils from 'utils/file_utils';

import {FormattedHTMLMessage, FormattedMessage} from 'react-intl';
import {browserHistory} from 'react-router/es6';

const Preferences = Constants.Preferences;
const TutorialSteps = Constants.TutorialSteps;
const ActionTypes = Constants.ActionTypes;
const KeyCodes = Constants.KeyCodes;

import React from 'react';
import ReactSelect from 'react-select-plus';
import PropTypes from 'prop-types';
import {OverlayTrigger, Tooltip} from 'react-bootstrap';

export const REACTION_PATTERN = /^(\+|-):([^:\s]+):\s*$/;

export default class CreatePostPharoTweet extends React.Component {
    constructor(props) {
        super(props);

        this.lastTime = 0;

        this.doSubmit = this.doSubmit.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.postMsgKeyPress = this.postMsgKeyPress.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleFileUploadChange = this.handleFileUploadChange.bind(this);
        this.handleUploadStart = this.handleUploadStart.bind(this);
        this.handleFileUploadComplete = this.handleFileUploadComplete.bind(this);
        this.handleUploadError = this.handleUploadError.bind(this);
        this.removePreview = this.removePreview.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onPreferenceChange = this.onPreferenceChange.bind(this);
        this.getFileCount = this.getFileCount.bind(this);
        this.getFileUploadTarget = this.getFileUploadTarget.bind(this);
        this.getCreatePostControls = this.getCreatePostControls.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.focusTextbox = this.focusTextbox.bind(this);
        this.showPostDeletedModal = this.showPostDeletedModal.bind(this);
        this.hidePostDeletedModal = this.hidePostDeletedModal.bind(this);
        this.showShortcuts = this.showShortcuts.bind(this);
        this.handleEmojiClick = this.handleEmojiClick.bind(this);
        this.handlePostError = this.handlePostError.bind(this);
        this.hideNotifyAllModal = this.hideNotifyAllModal.bind(this);
        this.showNotifyAllModal = this.showNotifyAllModal.bind(this);
        this.handleNotifyModalCancel = this.handleNotifyModalCancel.bind(this);
        this.handleNotifyAllConfirmation = this.handleNotifyAllConfirmation.bind(this);

        this.handleTopicChange = this.handleTopicChange.bind(this);
        this.handleSourceChange = this.handleSourceChange.bind(this);
        this.handleOtherChange = this.handleOtherChange.bind(this);
        this.handleSubjectChange = this.handleSubjectChange.bind(this);

        this.getOtherTags = this.getOtherTags.bind(this);
        this.getTopicOtherTags = this.getTopicOtherTags.bind(this);
        this.getSourceOtherTags = this.getSourceOtherTags.bind(this);

        this.nextPostCritical = this.nextPostCritical.bind(this);

        PostStore.clearDraftUploads();

        const channel = ChannelStore.getCurrent();
        const channelId = channel.id;
        const draft = PostStore.getDraft(channelId);
        const stats = ChannelStore.getCurrentStats();
        const members = stats.member_count - 1;

        this.state = {
            channelId,
            channel,
            message: draft.message,
            uploadsInProgress: draft.uploadsInProgress,
            fileInfos: draft.fileInfos,
            submitting: false,
            ctrlSend: PreferenceStore.getBool(Constants.Preferences.CATEGORY_ADVANCED_SETTINGS, 'send_on_ctrl_enter'),
            fullWidthTextBox: PreferenceStore.get(Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.CHANNEL_DISPLAY_MODE, Preferences.CHANNEL_DISPLAY_MODE_DEFAULT) === Preferences.CHANNEL_DISPLAY_MODE_FULL_SCREEN,
            showTutorialTip: false,
            showPostDeletedModal: false,
            enableSendButton: false,
            showEmojiPicker: false,
            showConfirmModal: false,
            totalMembers: members,
            topic: '',
            topicLabel: '',
            topicValidationBorder: { border:'solid 1px #ccc' },
            source: '',
            sourceLabel: '',
            sourceValidationBorder: { border:'solid 1px #ccc' },
            other: [],            
            subject: '',
            subjectValidationBorder: { border:'solid 1px #ccc' },
            tags: global.window.mm_pharo_config.tags,
            topicTagsList: this.getAllTopicTags(global.window.mm_pharo_config.tags.topicTags),
            topicTagsGroupedList: this.getGroupedTopicTags(global.window.mm_pharo_config.tags.topicTags),
            sourceTagsList: global.window.mm_pharo_config.tags.sourceTags.map((tag) => { return { value: tag.tag, label: tag.name }; }),
            commonTagsList: global.window.mm_pharo_config.tags.commonTags.map((tag) => { return { value: tag.tag, label: tag.name }; }),
            otherTagsList: [],
            topicSelectedRelatedOtherTagsList: [],
            sourceSelectedRelatedOtherTagsList: [],
            otherSelectedTagsList: [],
            nextPostCritical: false
        };

        this.lastBlurAt = 0;
    }

    handleTopicChange(event) {
        // tag selection cleared
        if(event === null)
        {
            this.setState({
                topic: '',
                topicLabel: '',
                topicValidationBorder: { border:'solid 1px #ccc' },
                topicSelectedRelatedOtherTagsList: this.getTopicOtherTags(),
                otherSelectedTagsList: this.getOtherTags()
            });

            return;
        }

        // tag selected
        this.setState({
            topic: event.value,
            topicLabel: event.label,
            topicSelectedRelatedOtherTagsList: this.getTopicOtherTags(event.value),
            otherSelectedTagsList: this.getOtherTags(event.value,null)
        });

        if(event.value === undefined || event.value.trim().length === 0)
            this.setState({topicValidationBorder: { border:'solid 1px red' }});
        else
            this.setState({topicValidationBorder: { border:'solid 1px #ccc' }});
    }

    handleSourceChange (event) {
        if(event === null)
        {
            this.setState({
                source: '',
                sourceLabel: '',
                sourceValidationBorder: { border:'solid 1px #ccc' },
                sourceSelectedRelatedOtherTagsList: this.getSourceOtherTags(),
                otherSelectedTagsList: this.getOtherTags()
            });
            
            return;
        }

        this.setState({
            source: event.value,
            sourceLabel: event.label,
            sourceSelectedRelatedOtherTagsList: this.getSourceOtherTags(event.value),            
            otherSelectedTagsList: this.getOtherTags(null,event.value)
        });

        if(event.value === undefined || event.value.trim().length === 0)
            this.setState({sourceValidationBorder: { border:'solid 1px red' }});
        else
            this.setState({sourceValidationBorder: { border:'solid 1px #ccc' }});
    }

    handleSubjectChange (event) {
        this.setState({subject: event.target.value});

        if(event.target.value === undefined || event.target.value.trim().length === 0)
            this.setState({subjectValidationBorder: { border:'solid 1px red' }});
        else
            this.setState({subjectValidationBorder: { border:'solid 1px #ccc' }});        
    }

	handleOtherChange (value) {
		console.log('You\'ve selected:', value);
		this.setState({ other: value });
	}

    handlePostError(postError) {
        this.setState({postError});
    }

    toggleEmojiPicker = () => {
        this.setState({showEmojiPicker: !this.state.showEmojiPicker});
    }

    hideEmojiPicker = () => {
        this.setState({showEmojiPicker: false});
    }

    doSubmit(e) {
        if (e) {
            e.preventDefault();
        }

        if (this.state.uploadsInProgress.length > 0 || this.state.submitting) {
            return;
        }

        const post = {};
        post.file_ids = [];
        post.message = this.state.message;

        if (post.message.trim().length === 0 && this.state.fileInfos.length === 0) {
            return;
        }

        // validate Pharo input form if not PM
        const currentUser = UserStore.getCurrentUser();

        if (this.state.topic === undefined || this.state.topic.trim().length === 0) 
        {
            if(currentUser)
            {
                if(this.state.topic === undefined || this.state.topic.trim().length === 0)
                    this.setState({topicValidationBorder: { border:'solid 1px red' }});

                return;
            }
        }

        if(this.state.topic.length > 0)
        {
            if(this.state.topic.length > 0)
                post.message = "`" + this.state.topicLabel + "` - ";
        }

        post.message = post.message + this.state.message + " ";

        var selectedTopicTag = this.state.tags.topicTags.countryTopicTags.find(x => x.tag === this.state.topic);

        // append our tags to the message
        if(this.state.topic.toLocaleLowerCase().length > 0)
            post.message = post.message + " #" + this.state.topic.toLocaleLowerCase();

        // if topic tag has a region set add that as a tag as well
        if(selectedTopicTag && selectedTopicTag.region)
            post.message = post.message + " #" + selectedTopicTag.region;

        // if critical highlight
        if(this.state.nextPostCritical)
            post.message = "** " + post.message + " #important **";

        if (this.state.postError) {
            this.setState({errorClass: 'animation--highlight'});
            setTimeout(() => {
                this.setState({errorClass: null});
            }, Constants.ANIMATION_TIMEOUT);
            return;
        }

        MessageHistoryStore.storeMessageInHistory(this.state.message);

        this.setState({submitting: true, serverError: null});

        const isReaction = REACTION_PATTERN.exec(post.message);
        if (post.message.indexOf('/') === 0) {
            PostStore.storeDraft(this.state.channelId, null);
            this.setState({message: '', postError: null, fileInfos: [], enableSendButton: false});

            const args = {};
            args.channel_id = this.state.channelId;
            ChannelActions.executeCommand(
                post.message,
                args,
                (data) => {
                    this.setState({submitting: false});

                    if (post.message.trim() === '/logout') {
                        GlobalActions.clientLogout(data.goto_location);
                        return;
                    }

                    if (data.goto_location && data.goto_location.length > 0) {
                        if (data.goto_location.startsWith('/') || data.goto_location.includes(window.location.hostname)) {
                            browserHistory.push(data.goto_location);
                        } else {
                            window.open(data.goto_location);
                        }
                    }
                },
                (err) => {
                    if (err.sendMessage) {
                        this.sendMessage(post);
                    } else {
                        this.setState({
                            serverError: err.message,
                            submitting: false,
                            message: post.message
                        });
                    }
                }
            );
        } else if (isReaction && EmojiStore.has(isReaction[2])) {
            this.sendReaction(isReaction);
        } else {
            this.sendMessage(post);
        }

        this.setState({
            message: '',
            submitting: false,
            postError: null,
            fileInfos: [],
            serverError: null,
            enableSendButton: false,
            topic: '',
            source: '',
            other: [],
            subject: '',
            nextPostCritical: false
        });

        const fasterThanHumanWillClick = 150;
        const forceFocus = (Date.now() - this.lastBlurAt < fasterThanHumanWillClick);

        this.focusTextbox(forceFocus);
    }

    handleNotifyAllConfirmation(e) {
        this.hideNotifyAllModal();
        this.doSubmit(e);
    }

    hideNotifyAllModal() {
        this.setState({showConfirmModal: false});
    }

    showNotifyAllModal() {
        this.setState({showConfirmModal: true});
    }

    handleSubmit(e) {
        const stats = ChannelStore.getCurrentStats();
        const members = stats.member_count - 1;
        const updateChannel = ChannelStore.getCurrent();

        if ((this.state.message.includes('@all') || this.state.message.includes('@channel')) && members >= Constants.NOTIFY_ALL_MEMBERS) {
            this.setState({totalMembers: members});
            this.showNotifyAllModal();
            return;
        }

        if (this.state.message.trimRight() === '/header') {
            GlobalActions.showChannelHeaderUpdateModal(updateChannel);
            this.setState({message: ''});
            return;
        }

        const isDirectOrGroup = ((updateChannel.type === Constants.DM_CHANNEL) || (updateChannel.type === Constants.GM_CHANNEL));
        if (!isDirectOrGroup && this.state.message.trimRight() === '/purpose') {
            GlobalActions.showChannelPurposeUpdateModal(updateChannel);
            this.setState({message: ''});
            return;
        }

        this.doSubmit(e);
    }

    handleNotifyModalCancel() {
        this.setState({showConfirmModal: false});
    }

    sendMessage(post) {
        post.channel_id = this.state.channelId;

        const time = Utils.getTimestamp();
        const userId = UserStore.getCurrentId();
        post.pending_post_id = `${userId}:${time}`;
        post.user_id = userId;
        post.create_at = time;
        post.parent_id = this.state.parentId;

        GlobalActions.emitUserPostedEvent(post);

        PostActions.createPost(post, this.state.fileInfos,
            () => GlobalActions.postListScrollChange(true),
            (err) => {
                if (err.id === 'api.post.create_post.root_id.app_error') {
                    // this should never actually happen since you can't reply from this textbox
                    this.showPostDeletedModal();
                } else {
                    this.forceUpdate();
                }

                this.setState({
                    submitting: false
                });
            }
        );
    }

    sendReaction(isReaction) {
        const action = isReaction[1];

        const emojiName = isReaction[2];
        const postId = PostStore.getLatestPostId(this.state.channelId);

        if (postId && action === '+') {
            PostActions.addReaction(this.state.channelId, postId, emojiName);
        } else if (postId && action === '-') {
            PostActions.removeReaction(this.state.channelId, postId, emojiName);
        }

        PostStore.storeDraft(this.state.channelId, null);
    }

    focusTextbox(keepFocus = false) {
        if (keepFocus || !Utils.isMobile()) {
            this.refs.textbox.focus();
        }
    }

    postMsgKeyPress(e) {
        if (!UserAgent.isMobile() && ((this.state.ctrlSend && e.ctrlKey) || !this.state.ctrlSend)) {
            if (e.which === KeyCodes.ENTER && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                ReactDOM.findDOMNode(this.refs.textbox).blur();
                this.handleSubmit(e);
            }
        }

        GlobalActions.emitLocalUserTypingEvent(this.state.channelId, '');
    }

    handleChange(e) {
        const message = e.target.value;
        const enableSendButton = this.handleEnableSendButton(message, this.state.fileInfos);

        this.setState({
            message,
            enableSendButton
        });

        const draft = PostStore.getDraft(this.state.channelId);
        draft.message = message;
        PostStore.storeDraft(this.state.channelId, draft);
    }

    handleFileUploadChange() {
        this.focusTextbox(true);
    }

    handleUploadStart(clientIds, channelId) {
        const draft = PostStore.getDraft(channelId);

        draft.uploadsInProgress = draft.uploadsInProgress.concat(clientIds);
        PostStore.storeDraft(channelId, draft);

        this.setState({uploadsInProgress: draft.uploadsInProgress});

        // this is a bit redundant with the code that sets focus when the file input is clicked,
        // but this also resets the focus after a drag and drop
        this.focusTextbox();
    }

    handleFileUploadComplete(fileInfos, clientIds, channelId) {
        const draft = PostStore.getDraft(channelId);

        // remove each finished file from uploads
        for (let i = 0; i < clientIds.length; i++) {
            const index = draft.uploadsInProgress.indexOf(clientIds[i]);

            if (index !== -1) {
                draft.uploadsInProgress.splice(index, 1);
            }
        }

        draft.fileInfos = draft.fileInfos.concat(fileInfos);
        PostStore.storeDraft(channelId, draft);

        if (channelId === this.state.channelId) {
            this.setState({
                uploadsInProgress: draft.uploadsInProgress,
                fileInfos: draft.fileInfos,
                enableSendButton: true
            });
        }
    }

    handleUploadError(err, clientId, channelId) {
        let message = err;
        if (message && typeof message !== 'string') {
            // err is an AppError from the server
            message = err.message;
        }

        if (clientId !== -1) {
            const draft = PostStore.getDraft(channelId);

            const index = draft.uploadsInProgress.indexOf(clientId);
            if (index !== -1) {
                draft.uploadsInProgress.splice(index, 1);
            }

            PostStore.storeDraft(channelId, draft);

            if (channelId === this.state.channelId) {
                this.setState({uploadsInProgress: draft.uploadsInProgress});
            }
        }

        this.setState({serverError: message});
    }

    removePreview(id) {
        const fileInfos = Object.assign([], this.state.fileInfos);
        const uploadsInProgress = this.state.uploadsInProgress;

        // Clear previous errors
        this.handleUploadError(null);

        // id can either be the id of an uploaded file or the client id of an in progress upload
        let index = fileInfos.findIndex((info) => info.id === id);
        if (index === -1) {
            index = uploadsInProgress.indexOf(id);

            if (index !== -1) {
                uploadsInProgress.splice(index, 1);
                this.refs.fileUpload.getWrappedInstance().cancelUpload(id);
            }
        } else {
            fileInfos.splice(index, 1);
        }

        const draft = PostStore.getDraft(this.state.channelId);
        draft.fileInfos = fileInfos;
        draft.uploadsInProgress = uploadsInProgress;
        PostStore.storeDraft(this.state.channelId, draft);
        const enableSendButton = this.handleEnableSendButton(this.state.message, fileInfos);

        this.setState({fileInfos, uploadsInProgress, enableSendButton});

        this.handleFileUploadChange();
    }

    componentWillMount() {
        const tutorialStep = PreferenceStore.getInt(Preferences.TUTORIAL_STEP, UserStore.getCurrentId(), 999);
        const enableSendButton = this.handleEnableSendButton(this.state.message, this.state.fileInfos);

        // wait to load these since they may have changed since the component was constructed (particularly in the case of skipping the tutorial)
        this.setState({
            ctrlSend: PreferenceStore.getBool(Preferences.CATEGORY_ADVANCED_SETTINGS, 'send_on_ctrl_enter'),
            fullWidthTextBox: PreferenceStore.get(Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.CHANNEL_DISPLAY_MODE, Preferences.CHANNEL_DISPLAY_MODE_DEFAULT) === Preferences.CHANNEL_DISPLAY_MODE_FULL_SCREEN,
            showTutorialTip: tutorialStep === TutorialSteps.POST_POPOVER,
            enableSendButton,
            topicSelectedRelatedOtherTagsList: this.getTopicOtherTags(),
            sourceSelectedRelatedOtherTagsList: this.getSourceOtherTags(),
            otherTagsList: this.getOtherTags(),
            otherSelectedTagsList: this.getOtherTags()            
        });
    }

    componentDidMount() {
        ChannelStore.addChangeListener(this.onChange);
        PreferenceStore.addChangeListener(this.onPreferenceChange);

        this.focusTextbox();
        document.addEventListener('keydown', this.showShortcuts);
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.channelId !== this.state.channelId) {
            this.focusTextbox();
        }
    }

    componentWillUnmount() {
        ChannelStore.removeChangeListener(this.onChange);
        PreferenceStore.removeChangeListener(this.onPreferenceChange);
        document.removeEventListener('keydown', this.showShortcuts);
    }

    showShortcuts(e) {
        if ((e.ctrlKey || e.metaKey) && e.keyCode === Constants.KeyCodes.FORWARD_SLASH) {
            e.preventDefault();
            const args = {};
            args.channel_id = this.state.channelId;
            ChannelActions.executeCommand(
                '/shortcuts',
                args,
                null,
                (err) => {
                    this.setState({
                        serverError: err.message,
                        submitting: false
                    });
                }
            );
        }
    }

    onChange() {
        const channelId = ChannelStore.getCurrentId();
        if (this.state.channelId !== channelId) {
            const draft = PostStore.getDraft(channelId);

            this.setState({channelId, message: draft.message, submitting: false, serverError: null, postError: null, fileInfos: draft.fileInfos, uploadsInProgress: draft.uploadsInProgress});
        }
    }

    onPreferenceChange() {
        const tutorialStep = PreferenceStore.getInt(Preferences.TUTORIAL_STEP, UserStore.getCurrentId(), 999);
        this.setState({
            showTutorialTip: tutorialStep === TutorialSteps.POST_POPOVER,
            ctrlSend: PreferenceStore.getBool(Preferences.CATEGORY_ADVANCED_SETTINGS, 'send_on_ctrl_enter'),
            fullWidthTextBox: PreferenceStore.get(Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.CHANNEL_DISPLAY_MODE, Preferences.CHANNEL_DISPLAY_MODE_DEFAULT) === Preferences.CHANNEL_DISPLAY_MODE_FULL_SCREEN
        });
    }

    getOtherTags(selectedTopicTag, selectedSourceTag) {
        let topicOtherTags = selectedTopicTag === null ? this.state.topicSelectedRelatedOtherTagsList : Utils.removeDuplicatesBy(x => x.value,this.getTopicOtherTags(selectedTopicTag));
        let sourceOtherTags = selectedSourceTag === null ? this.state.sourceSelectedRelatedOtherTagsList : Utils.removeDuplicatesBy(x => x.value,this.getSourceOtherTags(selectedSourceTag));
        let otherTags = [{ label: "Common Tags", options:this.state.commonTagsList}, { label: "Topic Tags", options:topicOtherTags}, { label: "Source Tags", options:sourceOtherTags}];//topicOtherTags.concat(sourceOtherTags);
        // remove any duplicates before returning
        //return Utils.removeDuplicatesBy(x => x.value, otherTags);
        return otherTags;
    }

    getTopicOtherTags(selectedTopicTag) {
        let otherTags = [];

        // if we have topic selected get only tags related to the selected topic
        if(selectedTopicTag !== null && selectedTopicTag !== undefined)
        {
            let topicTag = this.state.topicTagsList.find(x => x.tag == selectedTopicTag);
            if(topicTag.relatedOtherTags !== undefined)
            {
                topicTag.relatedOtherTags.forEach(function(otherTag) {    
                    let newTag = { value: otherTag.tag, label: otherTag.name };
                    if(!otherTags.includes(newTag))
                        otherTags.push(newTag);
                });
            }
        }
        else
        {
            // topic is not selected, get tags for all topics
            this.state.topicTagsList.forEach(function(topicTag) {    
                if(topicTag.relatedOtherTags !== undefined)
                {
                    topicTag.relatedOtherTags.forEach(function(otherTag) {    
                        let newTag = { value: otherTag.tag, label: otherTag.name };
                        if(!otherTags.includes(newTag))
                            otherTags.push(newTag);
                    });
                }        
            });
        }

        return otherTags;
    }

    getSourceOtherTags(selectedSourceTag) {
        let otherTags = [];

        // if we have source selected get only tags related to the selected source
        if(selectedSourceTag !== null && selectedSourceTag !== undefined)
        {
            let sourceTag = this.state.tags.sourceTags.find(x => x.tag == selectedSourceTag); 
            if(sourceTag.relatedOtherTags !== undefined)
            {
                sourceTag.relatedOtherTags.forEach(function(otherTag) {    
                    let newTag = { value: otherTag.tag, label: otherTag.name };
                    if(!otherTags.includes(newTag))
                        otherTags.push(newTag);
                });
            }
        }
        else
        {
            // source is not selected, get tags for all topics
            this.state.tags.sourceTags.forEach(function(topicTag) {    
                if(topicTag.relatedOtherTags !== undefined)
                {
                    topicTag.relatedOtherTags.forEach(function(otherTag) {    
                        let newTag = { value: otherTag.tag, label: otherTag.name };
                        if(!otherTags.includes(newTag))
                            otherTags.push(newTag);
                    });
                }        
            });
        }

        return otherTags;
    } 

    getAllTopicTags(tags)
    {
        var topicTags = [];
        topicTags = topicTags.concat(tags.assetTopicTags, tags.countryTopicTags, tags.generalTopicTags, tags.regionTopicTags, tags.internalTopicTags);
        return topicTags;
    }

    getGroupedTopicTags(tags)
    {
        var topicTags = [];
        
        var assetTopicTags = tags.assetTopicTags.map((tag) => { return { value: tag.tag, label: tag.name }; });
        var countryTopicTags = tags.countryTopicTags.map((tag) => { return { value: tag.tag, label: tag.name }; });
        var generalTopicTags = tags.generalTopicTags.map((tag) => { return { value: tag.tag, label: tag.name }; });
        var regionTopicTags = tags.regionTopicTags.map((tag) => { return { value: tag.tag, label: tag.name }; });
        var internalTopicTags = tags.internalTopicTags.map((tag) => { return { value: tag.tag, label: tag.name }; });
        
        topicTags = [
            { label: "General Tags", options:generalTopicTags}, 
            { label: "Region Tags", options:regionTopicTags}, 
            { label: "Country Tags", options:countryTopicTags}, 
            { label: "Asset Tags", options:assetTopicTags},
            { label: "Internal Tags", options:internalTopicTags}
        ];

        return topicTags;
    }

    getFileCount(channelId) {
        if (channelId === this.state.channelId) {
            return this.state.fileInfos.length + this.state.uploadsInProgress.length;
        }

        const draft = PostStore.getDraft(channelId);
        return draft.fileInfos.length + draft.uploadsInProgress.length;
    }

    getFileUploadTarget() {
        return this.refs.textbox;
    }

    getCreatePostControls() {
        return this.refs.createPostControls;
    }

    handleKeyDown(e) {
        if (this.state.ctrlSend && e.keyCode === KeyCodes.ENTER && e.ctrlKey === true) {
            this.postMsgKeyPress(e);
            return;
        }

        const latestReplyablePost = PostStore.getLatestReplyablePost(this.state.channelId);
        const latestReplyablePostId = latestReplyablePost == null ? '' : latestReplyablePost.id;
        const lastPostEl = document.getElementById(`commentIcon_${this.state.channelId}_${latestReplyablePostId}`);

        if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.keyCode === KeyCodes.UP && this.state.message === '') {
            e.preventDefault();

            const lastPost = PostStore.getCurrentUsersLatestPost(this.state.channelId);
            if (!lastPost) {
                return;
            }

            let type;
            if (lastPost.root_id && lastPost.root_id.length > 0) {
                type = Utils.localizeMessage('create_post.comment', 'Comment');
            } else {
                type = Utils.localizeMessage('create_post.post', 'Post');
            }

            AppDispatcher.handleViewAction({
                type: ActionTypes.RECEIVED_EDIT_POST,
                refocusId: '#post_textbox',
                title: type,
                message: lastPost.message,
                postId: lastPost.id,
                channelId: lastPost.channel_id,
                comments: PostStore.getCommentCount(lastPost)
            });
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey && e.shiftKey && e.keyCode === KeyCodes.UP && this.state.message === '' && lastPostEl) {
            e.preventDefault();
            if (document.createEvent) {
                const evt = document.createEvent('MouseEvents');
                evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                lastPostEl.dispatchEvent(evt);
            } else if (document.createEventObject) {
                const evObj = document.createEventObject();
                lastPostEl.fireEvent('onclick', evObj);
            }
        }

        if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.keyCode === Constants.KeyCodes.UP || e.keyCode === Constants.KeyCodes.DOWN)) {
            const lastMessage = MessageHistoryStore.nextMessageInHistory(e.keyCode, this.state.message, 'post');
            if (lastMessage !== null) {
                e.preventDefault();
                this.setState({
                    message: lastMessage
                });
            }
        }
    }

    handleBlur() {
        this.lastBlurAt = Date.now();
    }

    showPostDeletedModal() {
        this.setState({
            showPostDeletedModal: true
        });
    }

    hidePostDeletedModal() {
        this.setState({
            showPostDeletedModal: false
        });
    }

    handleEmojiClick(emoji) {
        const emojiAlias = emoji.name || emoji.aliases[0];

        if (!emojiAlias) {
            //Oops.. There went something wrong
            return;
        }

        if (this.state.message === '') {
            this.setState({message: ':' + emojiAlias + ': '});
        } else {
            //check whether there is already a blank at the end of the current message
            const newMessage = (/\s+$/.test(this.state.message)) ?
                this.state.message + ':' + emojiAlias + ': ' : this.state.message + ' :' + emojiAlias + ': ';

            this.setState({message: newMessage});
        }

        this.setState({showEmojiPicker: false});

        this.focusTextbox();
    }

    createTutorialTip() {
        const screens = [];

        screens.push(
            <div>
                <FormattedHTMLMessage
                    id='create_post.tutorialTip'
                    defaultMessage='<h4>Sending Messages</h4><p>Type here to write a message and press <strong>Enter</strong> to post it.</p><p>Click the <strong>Attachment</strong> button to upload an image or a file.</p>'
                />
            </div>
        );

        return (
            <TutorialTip
                placement='top'
                screens={screens}
                overlayClass='tip-overlay--chat'
                diagnosticsTag='tutorial_tip_1_sending_messages'
            />
        );
    }

    handleEnableSendButton(message, fileInfos) {
        return message.trim().length !== 0 || fileInfos.length !== 0;
    }

    nextPostCritical(val) {
        this.setState({nextPostCritical: val});
    }

    render() {
        const notifyAllTitle = (
            <FormattedMessage
                id='notify_all.title.confirm'
                defaultMessage='Confirm sending notifications to entire channel'
            />
        );

        const notifyAllConfirm = (
            <FormattedMessage
                id='notify_all.confirm'
                defaultMessage='Confirm'
            />
        );

        const notifyAllMessage = (
            <FormattedMessage
                id='notify_all.question'
                defaultMessage='By using @all or @channel you are about to send notifications to {totalMembers} people. Are you sure you want to do this?'
                values={{
                    totalMembers: this.state.totalMembers
                }}
            />
        );

        let serverError = null;
        if (this.state.serverError) {
            serverError = (
                <div className='has-error'>
                    <label className='control-label'>{this.state.serverError}</label>
                </div>
            );
        }

        let postError = null;
        if (this.state.postError) {
            const postErrorClass = 'post-error' + (this.state.errorClass ? (' ' + this.state.errorClass) : '');
            postError = <label className={postErrorClass}>{this.state.postError}</label>;
        }

        let preview = null;
        if (this.state.fileInfos.length > 0 || this.state.uploadsInProgress.length > 0) {
            preview = (
                <FilePreview
                    fileInfos={this.state.fileInfos}
                    onRemove={this.removePreview}
                    uploadsInProgress={this.state.uploadsInProgress}
                />
            );
        }

        let postFooterClassName = 'post-create-footer';
        if (postError) {
            postFooterClassName += ' has-error';
        }

        let tutorialTip = null;
        if (this.state.showTutorialTip) {
            tutorialTip = this.createTutorialTip();
        }

        let centerClass = '';
        if (!this.state.fullWidthTextBox) {
            centerClass = 'center';
        }

        let sendButtonClass = 'send-button theme';
        if (!this.state.enableSendButton) {
            sendButtonClass += ' disabled';
        }

        let attachmentsDisabled = '';
        if (!FileUtils.canUploadFiles()) {
            attachmentsDisabled = ' post-create--attachment-disabled';
        }

        const fileUpload = (
            <FileUpload
                ref='fileUpload'
                getFileCount={this.getFileCount}
                getTarget={this.getFileUploadTarget}
                onFileUploadChange={this.handleFileUploadChange}
                onUploadStart={this.handleUploadStart}
                onFileUpload={this.handleFileUploadComplete}
                onUploadError={this.handleUploadError}
                postType='post'
                channelId=''
            />
        );

        const handleNextPostCritical = (e) => {
            this.nextPostCritical(e.target.checked);
        };

        let emojiPicker = null;
        if (window.mm_config.EnableEmojiPicker === 'true') {
            emojiPicker = (
                <span className='emoji-picker__container'>
                    <EmojiPickerOverlay
                        show={this.state.showEmojiPicker}
                        container={this.props.getChannelView}
                        target={this.getCreatePostControls}
                        onHide={this.hideEmojiPicker}
                        onEmojiClick={this.handleEmojiClick}
                        rightOffset={15}
                        topOffset={-7}
                    />
                    <span
                        className='icon icon--emoji'
                        dangerouslySetInnerHTML={{__html: Constants.EMOJI_ICON_SVG}}
                        onClick={this.toggleEmojiPicker}
                        onMouseOver={EmojiPicker.beginPreloading}
                    />
                </span>
            );
        }        

        const criticalPostTooltip = (
            <Tooltip id='criticalPostTooltip'>
                <FormattedMessage
                    id='create_post_pharo.criticalPosts'
                    defaultMessage='Mark High Importance'
                />
            </Tooltip>
        );

        return (
            <form
                id='create_post'
                ref='topDiv'
                role='form'
                className={centerClass + ' pharo-tweet-create-post-form'}
                onSubmit={this.handleSubmit}
            >
                <div className={'post-create' + attachmentsDisabled}>
                    <div className='post-create-body'>
                        <div className='post-body__cell'>
                            <div>
                                <ReactSelect
                                    name="topicSelector"
                                    value={this.state.topic}
                                    placeholder="Topic ..."
                                    options={this.state.topicTagsGroupedList}
                                    onChange={this.handleTopicChange}
                                    style={this.state.topicValidationBorder}
                                />
                                <div key='criticalPostOption' id='criticalPostOption'>
                                    <div className='checkbox'>                                        
                                        <OverlayTrigger
                                            trigger={['hover', 'focus']}
                                            delayShow={Constants.OVERLAY_TIME_DELAY}
                                            placement='top'
                                            overlay={criticalPostTooltip}
                                        >                                            
                                            <label>
                                                <FormattedMessage
                                                    id='pharo.post.critical'
                                                    defaultMessage='!'
                                                />                                            
                                                <input
                                                    id='criticalPostCheckbox'
                                                    type='checkbox'
                                                    checked={this.state.nextPostCritical}
                                                    onChange={handleNextPostCritical}
                                                />
                                            </label>
                                        </OverlayTrigger>
                                    </div>
                                </div>                                
                            </div>                             
                            <Textbox
                                onChange={this.handleChange}
                                onKeyPress={this.postMsgKeyPress}
                                onKeyDown={this.handleKeyDown}
                                handlePostError={this.handlePostError}
                                value={this.state.message}
                                onBlur={this.handleBlur}
                                emojiEnabled={window.mm_config.EnableEmojiPicker === 'true'}
                                createMessage={Utils.localizeMessage('create_post.write', 'Write a message...')}
                                channelId={this.state.channelId}
                                popoverMentionKeyClick={true}
                                id='post_textbox'
                                ref='textbox'
                            />
                            <span
                                ref='createPostControls'
                                className='post-body__actions'
                            >
                                {fileUpload}
                                {emojiPicker}
                                <a
                                    className={sendButtonClass}
                                    onClick={this.handleSubmit}
                                >
                                    <i className='fa fa-paper-plane'/>
                                </a>
                            </span>
                        </div>
                        {tutorialTip}
                    </div>
                    <div className={postFooterClassName}>
                        <MsgTyping
                            channelId={this.state.channelId}
                            parentId=''
                        />
                        {postError}
                        {preview}
                        {serverError}
                    </div>
                </div>
                <PostDeletedModal
                    show={this.state.showPostDeletedModal}
                    onHide={this.hidePostDeletedModal}
                />
                <ConfirmModal
                    title={notifyAllTitle}
                    message={notifyAllMessage}
                    confirmButtonText={notifyAllConfirm}
                    show={this.state.showConfirmModal}
                    onConfirm={this.handleNotifyAllConfirmation}
                    onCancel={this.handleNotifyModalCancel}
                />
            </form>
        );
    }
}

CreatePostPharoTweet.propTypes = {
    getChannelView: PropTypes.func
};
