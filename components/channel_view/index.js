// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {General} from 'mattermost-redux/constants';
import {createSelector} from 'reselect';
import {getInt} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getChannel} from 'mattermost-redux/selectors/entities/channels';
import {withRouter} from 'react-router-dom';

import {getDirectTeammate} from 'utils/utils.jsx';
import {TutorialSteps, Preferences} from 'utils/constants.jsx';

import ChannelView from './channel_view';

// Temporary selector until getDirectTeammate is converted to be redux-friendly
const getDeactivatedChannel = createSelector(
    (state) => state.entities.users.profiles,
    (state, channelId) => channelId,
    (users, channelId) => {
        const teammate = getDirectTeammate(channelId);
        return Boolean(teammate && teammate.delete_at);
    }
);

function mapStateToProps(state) {
    const channelId = state.entities.channels.currentChannelId;    
    const config = getConfig(state);
    const enableTutorial = config.EnableTutorial === 'true';
    const tutorialStep = getInt(state, Preferences.TUTORIAL_STEP, getCurrentUserId(state), TutorialSteps.FINISHED);
    const currentChannel = getChannel(state, channelId) || {};
    return {
        channelId,
        channel: currentChannel,
        deactivatedChannel: getDeactivatedChannel(state, channelId),
        showTutorial: enableTutorial && tutorialStep <= TutorialSteps.INTRO_SCREENS,
    };
}

export default withRouter(connect(mapStateToProps)(ChannelView));
