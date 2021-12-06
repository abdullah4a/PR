
// must be include th web pack



import moment from 'moment';
import {
    config,
    shipHelpers,
} from '../../helpers';
import {
    store
} from '../../store';
import {
    eventBus
} from '../../main';
import {
    dataService
} from '../../services';
import {
    ResourceModel
} from '@bryntum/scheduler';
ResourceModel.childrenField = 'child';

const user = JSON.parse(localStorage.getItem('user'));
let headers = {
    'Content-Type': 'application/json; charset=utf-8'
};
if (user && user.token) {
    headers = {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json; charset=utf-8'
    };
}

const features = {
    timeRanges: {
        showCurrentTimeLine: {
            name: moment().format('D.M'),
        },
        showHeaderElements: true,
        enableResizing: false
    },
    pan: true,
    eventDragCreate: false,
    nonWorkingTime: true,
    tree: true,
    timeAxisHeaderMenu: {
        items: {
            // Remove "Filter tasks" item provided by EventFilter feature
            eventsFilter: false,
            dateRange: {
                text: 'Date range',
                menu: {
                    items: {
                        startDateField: {
                            label: 'Start date',
                            format: 'DD.MM.Y'
                        },
                        endDateField: {
                            label: 'End date',
                            format: 'DD.MM.Y',
                            onItem({
                                data
                            }) {
                                console.log(data);
                            }
                        }
                    }
                },

            }
        }
    },
    // headerZoomFeature: false,
    eventTooltip: {
        // tools      : [
        //     {
        //         cls     : 'b-fa b-fa-folder-open',
        //         handler : function () {
        //             eventBus.$emit('openProject', this.eventRecord);
        //             this.hide();
        //         }
        //     },
        //     {
        //         cls     : 'b-fa b-fa-trash',
        //         handler : function () {
        //             // this.schedulerConfig.eventStore.remove(this.eventRecord);
        //             eventBus.$emit('deleteProject', this.eventRecord);
        //             this.hide();
        //         }
        //     },
        // ],
        // header : {
        //     titleAlign : 'start'
        // },
        // Tooltip configs can be used here
        // anchorToTarget : false,
        // trackMouse     : true,
        // A custom HTML template
        template: (data) => {
            if (data.eventRecord.isVoyage === 2) { // ballast
                return `<div>Ballast</div><div style="font-size:14px">${moment(data.eventRecord.startDate).format('DD.MM HH:mm')} - ${moment(data.eventRecord.endDate).format('DD.MM HH:mm')}</div>`;
            } else if (data.eventRecord.id.toString().startsWith('capacity_')) { // Capacity event
                let cargo = data.eventRecord.cargo;
                let row1 = cargo.ton + 't ' + cargo.tonPercent + '% / ' + cargo.cuf + 'cuf ' + cargo.cufPercent + '%';
                let row2 = `<div style="font-size:14px">${moment(data.eventRecord.startDate).format('DD.MM HH:mm')} - ${moment(data.eventRecord.endDate).format('DD.MM HH:mm')}</div>`
                return `<div style="white-space: pre-wrap;font-size:14px;font-weight:400;overflow:hidden">${row1}<div style="font-size:12px">${row2}</div></div>`;
            } else if (data.eventRecord.id > 1000000000) { // Cargo event
                let row1 = '';
                if (data.eventRecord.loadPort && data.eventRecord.dischPort) {
                    row1 += data.eventRecord.loadPort + ' - ' + data.eventRecord.dischPort + ' ';
                }
                let row2 = '';
                if (data.eventRecord.name) {
                    row2 += data.eventRecord.name + ' ';
                }
                let row3 = '';
                let cargo = shipHelpers.calculateCargo(data.eventRecord);
                row3 = cargo.ton + 't ' + cargo.tonPercent + '% / ' + cargo.cuf + 'cuf ' + cargo.cufPercent + '%';
                let row4 = `<div style="font-size:14px">ETA ${moment(data.eventRecord.startDate).format('DD.MM HH:mm')} - ETA ${moment(data.eventRecord.endDate).format('DD.MM HH:mm')}</div>`
                return `<div style="white-space: pre-wrap;font-size:14px;font-weight:400;overflow:hidden">${row1}<br/>${row2}<br/>${row3}<div style="font-size:12px">${row4}</div></div>`;
            }
            const nominatedShip = data.eventRecord.shipNameNominated ? `<div style="font-size:14px">${data.eventRecord.shipNameNominated}</div>` : '';
            const code = data.eventRecord.code ? `<div style="font-size:14px">Project: ${data.eventRecord.code}</div>` : '';
            const times = data.eventRecord.portAndTimeList ?
                `<div style="font-size:12px; line-height:16px;margin-bottom:5px">${data.eventRecord.portAndTimeList}</div>` :
                `<div style="font-size:14px">${moment(data.eventRecord.startDate).format('DD.MM HH:mm')} - ${moment(data.eventRecord.endDate).format('DD.MM HH:mm')}</div>`;

            let content = `${nominatedShip}${code}${times} <div style="white-space: pre-wrap;font-size:12px;line-height:16px;">${data.eventRecord.notes ? data.eventRecord.notes : ''}</div>`;
            if (data.eventRecord.authorName && data.eventRecord.modified) {
                content += `<div style="font-size:10px;height:15px"><span style="position:absolute;right:15px; bottom:5px">${data.eventRecord.authorName + ' ' + moment(data.eventRecord.modified).fromNow()}</span></div>`;
            }
            return content;
        }
    },
    scheduleTooltip: {
        // disabled: true,
        // getText: (date, event) => {
        //     console.log(date, event);
        //     return date;

        // }
    },
    eventDrag: {
        validatorFn: (context) => {
            // console.log(context);
            if (context.record.data.event.isVoyage === 1) {
                if (context.record.data.event.prevPort === 1) {
                    store.dispatch('alert/error', 'Voyages with previous port defined cannot be dragged.', {
                        root: true
                    });
                    return false;
                }
                if (context.resourceRecord.shipId && !context.newResource.shipId) {
                    store.dispatch('alert/error', 'Voyages cannot be transferred from ship resource to shipless resource.', {
                        root: true
                    });
                    return false;
                }
                if (!context.resourceRecord.shipId && context.newResource.shipId) {
                    store.dispatch('alert/error', 'Voyages cannot be transferred from shipless resource to ship resource.', {
                        root: true
                    });
                    return false;
                }
                if (context.resourceRecord.brand !== context.newResource.brand) {
                    store.dispatch('alert/error', 'Voyages cannot be transferred if ship brand type does not match.', {
                        root: true
                    });
                    return false;
                }
                return true;
            } else if (context.record.data.event.isVoyage === 2) {
                return false;
            } else if (context.record.data.event.id >= 1000000000) { // Cargo event
                return false;
            }
            return true;
        }
    },
    cellMenu: {
        items: {
            // Remove "Delete record" default item
            removeRow: false,
            // Remove "Before" and "After" items provided by Filter feature to only have "On" option for Date columns
            // filterDateBefore: false,
            // filterDateAfter: false
        }
    },
    eventMenu: {
        // Process items before menu is shown
        processItems({
            eventRecord,
            items
        }) {
            if (eventRecord.id >= 1000000000 || eventRecord.id.toString().startsWith('capacity_')) { // No menu on cargo events
                return false;
            } else if (eventRecord.isVoyage === 2) { // Hide context menu on ballast voyage
                items.deleteEvent.visible = false;
                items.editEvent.visible = false;
            } else {
                items.cloneItem = {
                    text: 'Clone event',
                    icon: 'b-fa-columns',
                    onItem({
                        eventRecord
                    }) {
                        eventBus.$emit('cloneProject', {
                            type: 0,
                            eventRecord
                        });
                    }
                };
                items.duplicateItem = {
                    text: 'Duplicate event',
                    icon: 'b-fa-clone',
                    onItem({
                        eventRecord
                    }) {
                        eventBus.$emit('cloneProject', {
                            type: 1,
                            eventRecord
                        });
                    }
                };
                if (eventRecord.isVoyage === 1) {
                    if (eventRecord.prevPort === 0) {
                        items.previousPortItem = {
                            text: 'Link to previous',
                            icon: 'b-fa-toggle-off',
                            async onItem({
                                eventRecord
                            }) {
                                eventBus.$emit('onBeforeCommit');
                                const res = await dataService.post('scheduler/previousport', {
                                    prevPort: 1,
                                    id: eventRecord.id,
                                    clone: 0
                                });
                                eventBus.$emit('commit');
                                if (res.type !== 'success') {
                                    store.dispatch(`alert/${res.type}`, res.text, {
                                        root: true
                                    });
                                }
                            }
                        };
                        items.previousClonePortItem = {
                            text: 'Link to clone',
                            icon: 'b-fa-toggle-off',
                            async onItem({
                                eventRecord
                            }) {
                                eventBus.$emit('onBeforeCommit');
                                const res = await dataService.post('scheduler/previousport', {
                                    prevPort: 1,
                                    id: eventRecord.id,
                                    clone: 1
                                });
                                eventBus.$emit('commit');
                                if (res.type !== 'success') {
                                    store.dispatch(`alert/${res.type}`, res.text, {
                                        root: true
                                    });
                                }
                            }
                        };
                    } else {
                        items.previousPortItem = {
                            text: 'Disable link to previous',
                            icon: 'b-fa-toggle-on',
                            async onItem({
                                eventRecord
                            }) {
                                eventBus.$emit('onBeforeCommit');
                                const res = await dataService.post('scheduler/previousport', {
                                    prevPort: 0,
                                    id: eventRecord.id
                                });
                                eventBus.$emit('commit');
                                if (res.type !== 'success') {
                                    store.dispatch(`alert/${res.type}`, res.text, {
                                        root: true
                                    });
                                }
                            }
                        };
                    }
                }
            }
        }
    },
};

const schedulerConfig = {
    minHeight: 'calc(100vh - 130px)',
    minWidth: '100%',
    resources: [],
    events: [],
    startDate: moment().subtract(14, 'day').toDate(),
    endDate: moment().add(30, 'day').toDate(),
    weekStartDay: 1,
    // minZoomLevel:  8,
    // maxZoomLevel:  12,
    // zoomOnTimeAxisDoubleClick: false,
    // subGridConfigs: {
    //     locked: {
    //         // Wide enough to not clip tick labels for all the zoom levels.
    //         width: 150
    //     }
    // },
    horizontalEventSorterFn: (a, b) => { // Overlapping sort order
        // Previous port always first
        // if (a.prevPort > b.prevPort) {
        //     console.log('prevPort 1', a.prevPort, b.prevPort);
        //     return -1;
        // } else if (a.prevPort < b.prevPort) {
        //     console.log('prevPort -1', a.prevPort, b.prevPort);
        //     return 1;
        // }

        // Cloned status always last
        if (a.status !== b.status && a.status === 3) {
            // console.log('status -1', a.status, b.status);
            return 1;
        }
        if (a.status !== b.status && b.status === 3) {
            // console.log('status 1', a.status, b.status);
            return -1;
        }
        // Otherwise default start end time order
        const startA = a.startDate;
        const endA = a.endDate;
        const startB = b.startDate;
        const endB = b.endDate;

        const sameStart = (startA - startB === 0);

        if (sameStart) {
            return endA > endB ? -1 : 1;
        }
        return (startA < startB) ? -1 : 1;
    },
    // verticalEventSorterFn : (a, b) => {
    //     console.log('sort');
    //     return b.startDate.getTime() - a.startDate.getTime();
    // },
    presets: [{
            base: 'hourAndDay',
            id: 'Daily',
            name: 'Daily',
            tickWidth: 25,
            tickHeight: 35,
            shiftUnit: 'day',
            shiftIncrement: 1,
            displayDateFormat: `DD.MM HH:mm {${moment().format('ZZ')}}`,
            headers: [{
                    unit: 'day',
                    renderer: (start, end, headerConfig) => {
                        if (start.getDay() === 0) {
                            headerConfig.headerCellCls = 'header-sunday';
                        } else if (start.getDay() === 6) {
                            headerConfig.headerCellCls = 'header-saturday';
                        }

                        return moment(start).format('ddd DD MMMM');
                    }
                },
                {
                    unit: 'hour',
                    dateFormat: 'HH',
                    increment: 3
                },
            ],
        },
        {
            base: 'weekAndMonth',
            id: 'Monthly',
            name: 'Monthly',
            tickWidth: 120,
            tickHeight: 105,
            displayDateFormat: 'DD.MM.YYYY',
            shiftUnit: 'week',
            shiftIncrement: 5,
            defaultSpan: 6,
            timeResolution: {
                unit: 'day',
                increment: 1
            },
            headers: [{
                    unit: 'month',
                    dateFormat: 'MMMM YYYY',
                },
                {
                    unit: 'week',
                    renderer: (start, end) => `w.${moment(start).format('W D')}-${moment(end).format('D.')}`
                        // return moment(start).format('D.M') + '-' + moment(end).format('D.M');
                        // return 'w.' + moment(start).format('w');

                }
            ]
        },

    ],
    viewPreset: {
        base: 'dayAndWeek',
        id: 'Weekly',
        name: 'Weekly',
        tickWidth: 50,
        tickHeight: 35,
        displayDateFormat: `DD.MM HH:mm {${moment().format('ZZ')}}`,
        headers: [{
                unit: 'week',
                dateFormat: 'w.W MMMM YYYY',
            },
            {
                unit: 'day',
                renderer: (start, end, headerConfig) => {
                    if (start.getDay() === 0) {
                        headerConfig.headerCellCls = 'header-sunday';
                    } else if (start.getDay() === 6) {
                        headerConfig.headerCellCls = 'header-saturday';
                    }

                    return moment(start).format('ddd DD');
                }
            },
        ],
    },
    columns: [{
        type: 'tree',
        text: 'Name',
        field: 'name',
        width: 130,
        expandedFolderIconCls: null,
        collapsedFolderIconCls: null,
        leafIconCls: null,
        htmlEncode: false,
        responsiveLevels: {
            small: {
                width: 100
            },
            '*': {
                width: 130
            }
        }
        // Custom header renderer
        // headerRenderer ({column}) => {column.text.toUpperCase() + '!'},
        // Custom cell renderer
        // renderer({record, value}) {
        //     return `<i class="b-fa b-fa-${record.gender}"></i>${value}`;
        // }
    }],
    resourceColumns: {
        columnWidth: 140,
        showAvatars: false,
        // headerRenderer : ({ resourceRecord }) => `${resourceRecord.id} - ${resourceRecord.name}`
    },
    responsiveLevels: {
        small: {
            levelWidth: 600,
            rowHeight: 70,
            barMargin: 5,
        },
        normal: {
            levelWidth: '*',
            rowHeight: 70,
            barMargin: 5,
        }
    },
    eventStyle: null,
    enableEventAnimations: false,
    passStartEndParameters: true,
    // multiEventSelect : true,
    features,
    resourceStore: {
        tree: true,
        fields: ['shipId'],
        readUrl: `${config.apiUrl}/scheduler/resources/read`,
        autoLoad: true,
        headers,
        fetchOptions: {
            credentials: 'omit'
        },
    },
    eventRenderer({
        eventRecord,
        tplData
    }) {
        // eventRecord is the event whose task bar is being drawn
        // resourceRecord is the record for the "row"
        // tplData is used to populate the template used for drawing the task bar

        // assign a CSS class
        tplData.cls += 'event-default';
        if (eventRecord.isVoyage === 1) { // Project type voyage
            tplData.eventColor = null;
            let bgColor = '#4bcffa';
            if (eventRecord.eventColor) {
                bgColor = eventRecord.eventColor;
            }
            let icon = '<i class="b-fa b-fa-lightbulb"></i>';
            let status = 'P';
            if (eventRecord.eventLabelType === 1) {
                bgColor = '#D9D8D8';
                if (eventRecord.status === 1) {
                    icon = '<i class="b-fa b-fa-trophy"></i>';
                    bgColor = '#DEEEC9';
                } else if (eventRecord.status === 2) {
                    icon = '<i class="b-fa b-fa-check"></i>';
                    bgColor = '#BCDC93';
                } else if (eventRecord.status === 3) {
                    icon = '<i class="b-fa b-fa-clone"></i>';
                    bgColor = 'white';
                }
            } else if (eventRecord.status === 1) {
                icon = '<i class="b-fa b-fa-trophy"></i>';
                status = 'N';
            } else if (eventRecord.status === 2) {
                icon = '<i class="b-fa b-fa-check"></i>';
                status = 'C';
            } else if (eventRecord.status === 3) {
                icon = '<i class="b-fa b-fa-clone"></i>';
                status = '';
                bgColor = 'white';
            }
            tplData.style = `background-color: ${bgColor};`;
            let content =
                `<div style="position:absolute;z-index:1;top:0;bottom:0;left:0;right:0;background-color: ${bgColor} !important"></div><div style="z-index:10; position:absolute; font-size: 13px; font-weight:400 !important; top:0px; padding-top:5px; line-height:13px;background-color: ${bgColor} !important">${icon}`;
            if (eventRecord.eventLabelType === 1) {
                const nominatedShip = eventRecord.shipNameNominated ? ` ${eventRecord.shipNameNominated}` : '';
                content += `${eventRecord.code}${nominatedShip}<br/>${eventRecord.locodeList}</div>`;
            } else {
                let cargo = '';
                if (eventRecord.cargoName) {
                    cargo = `<br/>${eventRecord.cargoName} ${Math.round(eventRecord.cargoQuantity)} ${eventRecord.cargoUnit}`;
                }
                content += `${eventRecord.firstPort}&nbsp[${eventRecord.firstPortEta}] ${status} - ${eventRecord.lastPort}${cargo}</div>`;
            }
            if (eventRecord.sum) {
                const sumColor = eventRecord.sum >= 0 ? 'black' : 'red';
                content += `<div style="opacity:1 !important;position:absolute; bottom:5px; z-index:1;font-size:10px;  font-weight:400 !important; line-height:11px">
                    Bud: <span style="color:${sumColor} !important;font-weight:400 !important;">${eventRecord.sum}</span>`;
                if (eventRecord.sumFinal && eventRecord.status === 2) {
                    const sumFinalColor = eventRecord.sumFinal >= 0 ? 'black' : 'red';
                    content += `<br/>Fin: <span style="color:${sumFinalColor} !important;font-weight:400 !important;">${eventRecord.sumFinal}</span>`;
                }
                content += '</div>';
            }
            if (eventRecord.lastEdit && eventRecord.lastEditName) {
                const lastEdit = moment.utc(eventRecord.lastEdit);
                content += `<div style="position:absolute; color:red; font-size:12px;  font-weight:400; bottom: 5px;right:0; z-index:3" 
                    title="Project was locked by ${eventRecord.lastEditName} ${lastEdit.fromNow()}">
                    <i class="b-fa b-fa-lock"></i></div>`;

            }
            return content;
        } else if (eventRecord.isVoyage === 2) { // Voyage ballast
            tplData.eventColor = null;
            tplData.eventStyle = null;
            tplData.style = 'background-color: #67b2e4;opacity:0.5;color:#67b2e4 !important';
            return '';
        } else if (eventRecord.id >= 1000000000) { // Calculate cargo events
            tplData.eventStyle = null;
            tplData.eventColor = null;
            tplData.style = `border-left:10px solid ${eventRecord.eventColor ? eventRecord.eventColor : '#ccc'} !important; background-color: #ecf0f1 !important;`;
            let row1 = '';
            if (eventRecord.loadPort && eventRecord.dischPort) {
                row1 += eventRecord.loadPort + ' - ' + eventRecord.dischPort + ' ';
            }
            let row2 = '';
            if (eventRecord.name) {
                row2 += eventRecord.name + ' ';
            }
            let row3 = '';
            let cargo = shipHelpers.calculateCargo(eventRecord);
            row3 = cargo.ton + 't ' + cargo.tonPercent + '% / ' + cargo.cuf + 'cuf ' + cargo.cufPercent + '%';
            return `<div style="white-space: pre-wrap;font-size:12px;font-weight:400 !important;overflow:hidden">${row1}<br/>${row2}<div style="font-weight:700 !important">${row3}<div></div>`;
        } else if (eventRecord.id.toString().split('_')[0] === 'capacity') { // Calculate capacity events
            tplData.eventStyle = null;
            tplData.eventColor = null;
            let cargo = eventRecord.cargo;
            let maxPercent = Math.max(cargo.cufPercent, cargo.tonPercent);
            tplData.height = 60;
            // tplData.style = `height:${maxPercent}%; `; 
            tplData.style = `background: transparent !important; border:0 !important; position:absolute`;
            let color = '#27ae60';
            if (maxPercent > 100) {
                color = '#e74c3c';
            } else if (maxPercent > 90) {
                color = '#f39c12';
            } else if (maxPercent > 70) {
                color = '#f1c40f';
            } else if (maxPercent > 0) {
                color = '#2ecc71';
            }
            let content = cargo.ton + 't ' + cargo.tonPercent + '% / ' + cargo.cuf + 'cuf ' + cargo.cufPercent + '%';
            return `<div style="width:100%;position:absolute;display:block;bottom:0;left:0;right:0;padding: ${maxPercent ? '5px 10px 5px 10px' : '0'};
            font-weight: 700 !important;
            height:${maxPercent ? maxPercent : 5}%; background: ${color}; 
            white-space: pre-wrap;font-size:12px;overflow:hidden">${maxPercent ? content : '&nbsp'}</div>`;
        }
        // Other projects

        if (store.state.data && store.state.data.schedulerParams && store.state.data.schedulerParams.projectTypes) {
            const projectType = store.state.data.schedulerParams.projectTypes.filter((o) => o.id === eventRecord.projectTypeId)[0];
            tplData.eventColor = null;
            const color = projectType ? projectType.eventColor : 'gray';
            tplData.style = `background-color: ${color}; opacity:0.8;color:black !important;`;
        }
        return `<div style="white-space: pre-wrap;font-size:13px;font-weight:400;overflow:hidden">${eventRecord.notes ? eventRecord.notes : ''}</div>`;
    },
    eventStore: {
        // Add a custom field and redefine durationUnit to default to hours
        fields: ['id', 'shipId', 'portCalls', 'laycan', 'status', 'projectTypeId', 'isVoyage', 'notes', 'recap', 'code', 'blDate', 'autoCode',
            'shipIdNominated', 'speed', 'authorName', 'modified', 'prevPort', 'etaUpdated', 'moneyData', 'eventColor', 'contactId', 'contactName',
            'dischCostsOnlyPort', 'loadPort', 'dischPort', 'quantity', 'unit', 'sf', 'dwt', 'cuf', 'cargo'
        ],
        writeAllFields: true, // true: send all parameters in request 
        // Setup urls
        createUrl: `${config.apiUrl}/scheduler/projects/create`,
        readUrl: `${config.apiUrl}/scheduler/projects/read`,
        updateUrl: `${config.apiUrl}/scheduler/projects/update`,
        deleteUrl: `${config.apiUrl}/scheduler/projects/delete`,
        // Load and save automatically
        // autoLoad: true,
        autoCommit: true,
        headers,
        fetchOptions: {
            credentials: 'omit',
        },
        onBeforeRemove(event) {
            console.log('onBeforeRemove', event);
            store.dispatch('alert/confirm', {
                message: `Are you sure you want to delete project permanently?`,
                emit: 'deleteProject',
                data: {
                    id: event.records[0].id
                }
            }, {
                root: true
            });
            // if (confirm("Press a button!")) {
            //     // context.finalize(true);
            //   } else {
            //     // context.finalize(false);
            //   }
            return false;
        },
        onRemove() {
            // console.log('onRemove');
        },
        onBeforeCommit() {
            // Make it read only since it only allows one commit at the time
            schedulerConfig.readOnly = true;
            eventBus.$emit('onBeforeCommit');
        },
        onCommit() {
            schedulerConfig.readOnly = false;
            console.log('commit');
            eventBus.$emit('commit');
        },
        onException(res) {
            console.log(res);
            if (res.action === 'update' && res.exception) {
                if (res.json && res.json.message === 'Version mismatch, project cannot be updated') {
                    store.dispatch('alert/error', 'Project version mismatch. The project has been modified and saved by ' + res.json.author +
                        ' after you have opened it. Please close the project and open it again to ensure you have the latest data available.', {
                            root: true
                        });
                }
            } else if (res.action === 'commit') {
                console.error('Commit failed');
                eventBus.$emit('commit');
            }
            schedulerConfig.readOnly = false;
        }
    },
};
export default schedulerConfig;