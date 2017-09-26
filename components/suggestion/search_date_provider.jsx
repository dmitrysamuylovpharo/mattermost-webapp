// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Suggestion from './suggestion.jsx';
import Provider from './provider.jsx';

import {autocompleteUsersInTeam} from 'actions/user_actions.jsx';

import AppDispatcher from 'dispatcher/app_dispatcher.jsx';
import * as Utils from 'utils/utils.jsx';
import {ActionTypes} from 'utils/constants.jsx';

import React from 'react';

class SearchDateSuggestion extends Suggestion {
    render() {
        const {item, isSelection} = this.props;

        let className = 'search-autocomplete__item';
        if (isSelection) {
            className += ' selected';
        }

        return (
            <div
                className={className}
                onClick={this.handleClick}
            >
                <i className='fa fa fa-plus-square'/>
                <div className='mention--align'>
                    <span>
                        {item.label}
                    </span>
                </div>
            </div>
        );
    }
}

export default class SearchDateProvider extends Provider {
    handlePretextChanged(suggestionId, pretext) {
        const captured = (/\bsince:\s*(\S*)$/i).exec(pretext.toLowerCase());
        if (captured) {
            const datePrefix = captured[1];

            this.startNewRequest(suggestionId, datePrefix);

            autocompleteUsersInTeam(
                datePrefix,
                (data) => {
                    if (this.shouldCancelDispatch(datePrefix)) {
                        return;
                    }

                    const today = new Date();
                    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1); 
                    const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
                    const last2Weeks = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14);
                    const lastMonth = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
                    const dates = Object.assign([], [{ label:'Yesterday', date:Utils.getSearchDate(yesterday) },{ label:'Last Week', date:Utils.getSearchDate(lastWeek) },{ label:'Last 2 Weeks', date:Utils.getSearchDate(last2Weeks) },{ label:'Last Month', date:Utils.getSearchDate(lastMonth) },]);
                    const mentions = [];//users.map((user) => user.username);
                    const dateLabels = dates.map((date) => date.date);

                    AppDispatcher.handleServerAction({
                        type: ActionTypes.SUGGESTION_RECEIVED_SUGGESTIONS,
                        id: suggestionId,
                        matchedPretext: datePrefix,
                        terms: dateLabels,
                        items: dates,
                        component: SearchDateSuggestion
                    });
                }
            );
        }

        return Boolean(captured);
    }
}
