/*
 *
 * (c) Copyright Ascensio System SIA 2010-2020
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */
/**
 *
 *  FormatRulesManagerDlg.js
 *
 *  Created by Julia.Radzhabova on 14.04.2020
 *  Copyright (c) 2020 Ascensio System SIA. All rights reserved.
 *
 */

define([  'text!spreadsheeteditor/main/app/template/FormatRulesManagerDlg.template',
    'common/main/lib/view/AdvancedSettingsWindow',
    'common/main/lib/component/ComboBox',
    'common/main/lib/component/ListView',
    'common/main/lib/component/InputField',
    'spreadsheeteditor/main/app/view/FormatRulesEditDlg'
], function (contentTemplate) {
    'use strict';

    SSE.Views = SSE.Views || {};

    var _CustomItem = Common.UI.DataViewItem.extend({
        initialize : function(options) {
            Common.UI.BaseView.prototype.initialize.call(this, options);

            var me = this;

            me.template = me.options.template || me.template;

            me.listenTo(me.model, 'change:sort', function() {
                me.render();
                me.trigger('change', me, me.model);
            });
            me.listenTo(me.model, 'change:selected', function() {
                var el = me.$el || $(me.el);
                el.toggleClass('selected', me.model.get('selected') && me.model.get('allowSelected'));
                me.onSelectChange(me.model, me.model.get('selected') && me.model.get('allowSelected'));
            });
            me.listenTo(me.model, 'remove', me.remove);
        }
    });

    SSE.Views.FormatRulesManagerDlg =  Common.Views.AdvancedSettingsWindow.extend(_.extend({
        options: {
            alias: 'FormatRulesManagerDlg',
            contentWidth: 510,
            height: 361,
            buttons: ['ok', 'cancel']
        },

        initialize: function (options) {
            var me = this;
            _.extend(this.options, {
                title: this.txtTitle,
                template: [
                    '<div class="box" style="height:' + (this.options.height-85) + 'px;">',
                    '<div class="content-panel" style="padding: 0;">' + _.template(contentTemplate)({scope: this}) + '</div>',
                    '</div>',
                    '<div class="separator horizontal"/>'
                ].join('')
            }, options);

            this.api        = options.api;
            this.handler    = options.handler;
            this.props      = options.props;
            this.langId      = options.langId;
            this.levels     = [];

            this.rulesStore = new Common.UI.DataViewStore();

            Common.Views.AdvancedSettingsWindow.prototype.initialize.call(this, this.options);
        },
        render: function () {
            Common.Views.AdvancedSettingsWindow.prototype.render.call(this);
            var me = this;

            this.cmbScope = new Common.UI.ComboBox({
                el          : $('#format-manager-combo-scope'),
                menuStyle   : 'min-width: 100%;',
                editable    : false,
                cls         : 'input-group-nr',
                data        : [
                    { value: Asc.c_oAscSelectionForCFType.selection, displayValue: this.textSelection },
                    { value: Asc.c_oAscSelectionForCFType.worksheet, displayValue: this.textThisSheet },
                    { value: Asc.c_oAscSelectionForCFType.table, displayValue: this.textThisTable },
                    { value: Asc.c_oAscSelectionForCFType.pivot, displayValue: this.textThisPivot }
                ]
            }).on('selected', function(combo, record) {
                me.refreshRuleList(record.value);
            });
            this.cmbScope.setValue(Asc.c_oAscSelectionForCFType.selection);

            this.rulesList = new Common.UI.ListView({
                el: $('#format-manager-rules-list', this.$window),
                store: new Common.UI.DataViewStore(),
                emptyText: '',
                template: _.template(['<div class="listview inner" style=""></div>'].join('')),
                itemTemplate: _.template([
                    '<div class="list-item" style="width: 100%;display:inline-block;" id="format-manager-item-<%= levelIndex %>">',
                        '<div style="width:181px;padding-right: 10px;display: inline-block;vertical-align: middle;overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><%= name %></div>',
                        '<div style="width:181px;padding-right: 10px;display: inline-block;vertical-align: middle;"><div id="format-manager-txt-rule-<%= levelIndex %>" style=""></div></div>',
                        '<div style="width:94px;display: inline-block;vertical-align: middle;"></div>',
                    '</div>'
                ].join(''))
            });
            this.rulesList.createNewItem = function(record) {
                return new _CustomItem({
                    template: this.itemTemplate,
                    model: record
                });
            };
            this.rulesList.on('item:select', _.bind(this.onSelectRule, this))
                            .on('item:keydown', _.bind(this.onKeyDown, this));

            this.btnNew = new Common.UI.Button({
                el: $('#format-manager-btn-new')
            });
            this.btnNew.on('click', _.bind(this.onEditRule, this, false));

            this.btnEdit = new Common.UI.Button({
                el: $('#format-manager-btn-edit')
            });
            this.btnEdit.on('click', _.bind(this.onEditRule, this, true));

            this.btnDelete = new Common.UI.Button({
                el: $('#format-manager-btn-delete')
            });
            this.btnDelete.on('click', _.bind(this.onDeleteRule, this));

            this.btnUp = new Common.UI.Button({
                parentEl: $('#format-manager-btn-up'),
                cls: 'btn-toolbar',
                iconCls: 'caret-up',
                hint: this.textUp
            });
            this.btnUp.on('click', _.bind(this.onMoveClick, this, true));

            this.btnDown = new Common.UI.Button({
                parentEl: $('#format-manager-btn-down'),
                cls: 'btn-toolbar',
                iconCls: 'caret-down',
                hint: this.textDown
            });
            this.btnDown.on('click', _.bind(this.onMoveClick, this, false));

            this.afterRender();
        },

        afterRender: function() {
            this._setDefaults(this.props);
        },

        _setDefaults: function (props) {
            this.rulesList.on('item:add', _.bind(this.addControls, this));
            this.rulesList.on('item:change', _.bind(this.addControls, this));
            this.refreshRuleList(this.cmbScope.getValue());
        },

        refreshRuleList: function(scope) {
            var levels = this.api.asc_getCF(scope, (scope==Asc.c_oAscSelectionForCFType.worksheet) ? this.api.asc_getActiveWorksheetIndex() : undefined);
            var arr = [];
            if (levels) {
                for (var i=0; i<levels.length; i++) {
                    var level = levels[i],
                        name = this.getRuleName(level);
                    arr.push({
                        levelIndex: i,
                        name: name,
                        tip: name,
                        range: level.asc_getLocation(),
                        props: level
                    });
                }
            }
            this.rulesList.store.reset(arr);
            (this.rulesList.store.length>0) && this.rulesList.selectByIndex(0);

            this.updateButtons();
        },

        getRuleName: function(rule) {
            var name = '';
            switch (rule.asc_getType()) {
                case Asc.c_oAscCFType.aboveAverage:
                    name = 'Above average';
                    var above = rule.asc_getAboveAverage(),
                        eq = rule.asc_getEqualAverage(),
                        stddev = rule.asc_getStdDev();
                    subtype = (above) ? 0 : 1;
                    if (eq)
                        subtype += 2;
                    else if (stddev) {
                        subtype += (2 + stddev*2);
                    }
                    switch (subtype) {
                        case 0:
                            name = 'Above average';
                            break;
                        case 1:
                            name = 'Below average';
                            break;
                        case 2:
                            name = 'Equal to or above average';
                            break;
                        case 3:
                            name = 'Equal to or below average';
                            break;
                        case 4:
                            name = '1 std dev above average';
                            break;
                        case 5:
                            name = '1 std dev below average';
                            break;
                        case 6:
                            name = '2 std dev above average';
                            break;
                        case 7:
                            name = '2 std dev below average';
                            break;
                        case 8:
                            name = '3 std dev above average';
                            break;
                        case 9:
                            name = '3 std dev below average';
                            break;
                    }
                    break;
                case Asc.c_oAscCFType.beginsWith:
                    name = 'Cell value begins with ' + (rule.asc_getContainsText() || '');
                    break;
                case Asc.c_oAscCFType.cellIs:
                    name = 'Cell value';
                    var subtype = rule.asc_getOperator(),
                        op;
                    switch (subtype) {
                        case Asc.c_oAscCFOperator.greaterThan:
                            op = '>';
                            name = name + ' ' + op + ' ' + (rule.asc_getValue1() || '');
                            break;
                        case Asc.c_oAscCFOperator.greaterThanOrEqual:
                            op = '>=';
                            name = name + ' ' + op + ' ' + (rule.asc_getValue1() || '');
                            break;
                        case Asc.c_oAscCFOperator.lessThan:
                            op = '<';
                            name = name + ' ' + op + ' ' + (rule.asc_getValue1() || '');
                            break;
                        case Asc.c_oAscCFOperator.lessThanOrEqual:
                            op = '<=';
                            name = name + ' ' + op + ' ' + (rule.asc_getValue1() || '');
                            break;
                        case Asc.c_oAscCFOperator.equal:
                            op = '=';
                            name = name + ' ' + op + ' ' + (rule.asc_getValue1() || '');
                            break;
                        case Asc.c_oAscCFOperator.notEqual:
                            op = '<>';
                            name = name + ' ' + op + ' ' + (rule.asc_getValue1() || '');
                            break;
                        case Asc.c_oAscCFOperator.between:
                            name = name + ' ' + Common.Utils.String.format('is between {0} and {1}', (rule.asc_getValue1() || ''), (rule.asc_getValue2() || ''));
                            break;
                        case Asc.c_oAscCFOperator.notBetween:
                            name = name + ' ' + Common.Utils.String.format('is not between {0} and {1}', (rule.asc_getValue1() || ''), (rule.asc_getValue2() || ''));
                            break;
                    }
                    break;
                case Asc.c_oAscCFType.colorScale:
                    name = 'Graded color scale';
                    break;
                case Asc.c_oAscCFType.containsBlanks:
                    name = 'Cell contains a blank value';
                    break;
                case Asc.c_oAscCFType.containsErrors:
                    name = 'Cell contains an error';
                    break;
                case Asc.c_oAscCFType.containsText:
                    name = 'Cell value contains ' + (rule.asc_getContainsText() || '');
                    break;
                case Asc.c_oAscCFType.dataBar:
                    name = 'Column';
                    break;
                case Asc.c_oAscCFType.duplicateValues:
                    name = 'Duplicate values';
                    break;
                case Asc.c_oAscCFType.expression:
                    name = 'Formula: ' + (rule.asc_getValue1() || '');
                    break;
                case Asc.c_oAscCFType.iconSet:
                    name = 'Icon set';
                    break;
                case Asc.c_oAscCFType.notContainsBlanks:
                    name = 'Cell does not contain a blank value';
                    break;
                case Asc.c_oAscCFType.notContainsErrors:
                    name = 'Cell does not contain an error';
                    break;
                case Asc.c_oAscCFType.notContainsText:
                    name = 'Cell value does not contain ' + (rule.asc_getContainsText() || '');
                    break;
                case Asc.c_oAscCFType.timePeriod:
                    var subtype = rule.asc_getTimePeriod();
                    switch (subtype) {
                        case Asc.c_oAscTimePeriod.yesterday:
                            name = 'Yesterday';
                            break;
                        case Asc.c_oAscTimePeriod.today:
                            name = 'Today';
                            break;
                        case Asc.c_oAscTimePeriod.tomorrow:
                            name = 'Tomorrow';
                            break;
                        case Asc.c_oAscTimePeriod.last7Days:
                            name = 'In the last 7 days';
                            break;
                        case Asc.c_oAscTimePeriod.lastWeek:
                            name = 'Last week';
                            break;
                        case Asc.c_oAscTimePeriod.thisWeek:
                            name = 'This week';
                            break;
                        case Asc.c_oAscTimePeriod.nextWeek:
                            name = 'Next week';
                            break;
                        case Asc.c_oAscTimePeriod.lastMonth:
                            name = 'Last month';
                            break;
                        case Asc.c_oAscTimePeriod.thisMonth:
                            name = 'This month';
                            break;
                        case Asc.c_oAscTimePeriod.nextMonth:
                            name = 'Next month';
                            break;
                    }
                    break;
                case Asc.c_oAscCFType.top10:
                    name = rule.asc_getBottom() ? 'Bottom' : 'Top';
                    name = name + ' ' + (rule.asc_getRank()) + (rule.asc_getPercent() ? '%' : '');
                    break;
                case Asc.c_oAscCFType.uniqueValues:
                    name = 'Unique values';
                    break;
                case Asc.c_oAscCFType.endsWith:
                    name = 'Cell value ends with ' + (rule.asc_getContainsText() || '');
                    break;
            }
            return name;
        },

        addControls: function(listView, itemView, item) {
            if (!item) return;

            var me = this,
                i = item.get('levelIndex'),
                cmpEl = this.rulesList.cmpEl.find('#format-manager-item-' + i);
            if (!this.levels[i])
                this.levels[i] = {};
            var level = this.levels[i];
            var input = new Common.UI.InputFieldBtn({
                el          : cmpEl.find('#format-manager-txt-rule-' + i),
                name        : 'range',
                style       : 'width: 100%;',
                btnHint     : this.textSelectData,
                allowBlank  : true,
                validateOnChange: true
            }).on('button:click', _.bind(this.onSelectData, this, level));

            var val = item.get('range');
            (val!==null) && input.setValue(val);
            level.txtDataRange = input;
            level.dataRangeValid = val;

            cmpEl.on('mousedown', 'input', function(){
                me.rulesList.selectRecord(item);
            });
        },

        onSelectData: function(item, cmp) {
            var me = this;
            if (me.api) {
                var handlerDlg = function(dlg, result) {
                    if (result == 'ok') {
                        item.dataRangeValid = dlg.getSettings();
                        item.txtDataRange.setValue(item.dataRangeValid);
                        item.txtDataRange.checkValidate();
                    }
                };

                var win = new SSE.Views.CellRangeDialog({
                    handler: handlerDlg
                }).on('close', function() {
                    me.show();
                });

                var xy = me.$window.offset();
                me.hide();
                win.show(xy.left + 160, xy.top + 125);
                win.setSettings({
                    api     : me.api,
                    range   : (!_.isEmpty(item.txtDataRange.getValue()) && (item.txtDataRange.checkValidate()==true)) ? item.txtDataRange.getValue() : item.dataRangeValid,
                    type    : Asc.c_oAscSelectionDialogType.Chart
                });
            }
        },

        onEditRule: function (isEdit) {
            var me = this,
                xy = me.$window.offset(),
                rec = this.rulesList.getSelectedRec();

            var win = new SSE.Views.FormatRulesEditDlg({
                api: me.api,
                props   : (isEdit && rec) ? rec.get('props') : null,
                isEdit  : isEdit,
                langId  : me.langId,
                handler : function(result, settings) {
                    if (result == 'ok' && settings) {
                        if (isEdit) {
                        } else {
                        }
                    }
                }
            }).on('close', function() {
                me.show();
            });

            me.hide();
            win.show();
        },

        onDeleteRule: function () {
            var store = this.rulesList.store,
                rec = this.rulesList.getSelectedRec();
            if (rec) {
                var index = rec.get('levelIndex');
                this.levels[index] = undefined;
                index = store.indexOf(rec);
                store.remove(rec);
                (store.length>0) && this.rulesList.selectByIndex(index<store.length ? index : store.length-1);
                this.rulesList.scrollToRecord(this.rulesList.getSelectedRec());
            }
            this.updateButtons();
        },

        onMoveClick: function(up) {
            var store = this.rulesList.store,
                length = store.length,
                rec = this.rulesList.getSelectedRec();
            if (rec) {
                var index = store.indexOf(rec);
                store.add(store.remove(rec), {at: up ? Math.max(0, index-1) : Math.min(length-1, index+1)});
                this.rulesList.selectRecord(rec);
                this.rulesList.scrollToRecord(rec);
            }
            this.updateMoveButtons();
        },

        onSelectRule: function(lisvView, itemView, record) {
            this.updateMoveButtons();
        },

        updateButtons: function() {
            this.btnNew.setDisabled(this.rulesList.store.length>63);
            this.btnDelete.setDisabled(this.rulesList.store.length<1);
            this.btnEdit.setDisabled(this.rulesList.store.length<1);
            this.updateMoveButtons();
            this.rulesList.scroller && this.rulesList.scroller.update();
        },

        updateMoveButtons: function() {
            var rec = this.rulesList.getSelectedRec(),
                index = rec ? this.rulesList.store.indexOf(rec) : -1;
            this.btnUp.setDisabled(index<1);
            this.btnDown.setDisabled(index<0 || index==this.rulesList.store.length-1);
        },

        getSettings: function() {
            return this.sort;
        },

        onKeyDown: function (lisvView, record, e) {
            if (e.keyCode==Common.UI.Keys.DELETE && !this.btnDelete.isDisabled())
                this.onDeleteRule();
        },

        txtTitle: 'Conditional Formatting',
        textNew: 'New',
        textEdit: 'Edit',
        textDelete: 'Delete',
        textUp: 'Move rule up',
        textDown: 'Move rule down',
        textSelection: 'Current selection',
        textThisSheet: 'This worksheet',
        textThisTable: 'This table',
        textThisPivot: 'This pivot',
        textScope: 'Show formatting rules for',
        textRules: 'Rules',
        textApply: 'Apply to',
        textFormat: 'Format',
        textSelectData: 'Select data'

    }, SSE.Views.FormatRulesManagerDlg || {}));
});