/// <reference path="../../typings/tsd.d.ts" />    
import settings = require('./settings');
import message = require('./message');
import azureQueue = require('./azureQueue');
import q = require('q');

export interface ICache {
    padUsed(numberOfBlocks: number): q.IPromise<(resolve: number, reject: any) => void>;
}

export class Cache implements ICache {
    private totalCached: number;
    private reportThreshold: number;
    private reportAmount: number;
    private azureQueue: azureQueue.IAzureQueue;

    constructor() {
        this.totalCached = 0;
        this.reportThreshold = settings.Settings.reportThreshold;
        this.reportAmount = settings.Settings.reportAmount;
        this.azureQueue = new azureQueue.AzureQueue();
    };

    /**
    * ## Add blocks to the cache, and then checks to see if amount cached is above reporting threshold.
    * !param numberOfBlocks    The number of block to report using.
    * !returns A promised that resolves with the total amount currently in the cache.
    */
    padUsed(numberOfBlocks: number): q.IPromise<(resolve: number, reject: any) => void> {
        let that = this;
        return q.Promise(function (resolve, reject) {
            that.totalCached = that.totalCached + numberOfBlocks;

            if (that.totalCached >= that.reportThreshold) {
                that.report()
                    .then(() => {
                        resolve(that.totalCached);
                    });
            } else {
                resolve(that.totalCached);
            }
        });
    }

    /**
     * ## Reports amoung of pad used, decreasing the cache. 
     * @return A promise that resolves null.
     */
    private report(): q.IPromise<(resolve: any, reject: any) => void> {
        let that = this;
        return q.Promise(function (resolve, reject) {
            while (that.totalCached >= that.reportThreshold) {
                let msg = new message.Message();
                that.azureQueue.sendPadBlockUsageReportMessage(msg);
                that.totalCached = that.totalCached - that.reportAmount;
            }
            resolve(null);
        });
    }
}