/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

class Vote extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const emptyVotingList = {};
        await ctx.stub.putState('votingList', Buffer.from(JSON.stringify(emptyVotingList)));
        console.info('============= END : Initialize Ledger ===========');
    }

    async registerUser(ctx, name,id, passwd, userSsn) {
        const key = 'ID_' + id;
        const userData = {
            name,
            passwd,
            userSsn,
        }
        let result = '';
        const check = await ctx.stub.getState(key);
        if(check.length != 0)
        {
            // throw new Error(`${id} is already existed`);
            result = `${id} is already existed`;
            return result;
        }

        await ctx.stub.putState(key,Buffer.from(JSON.stringify(userData)));
        console.info('===========  success register  ===========');
        result = 'success';
        return result;        
    }

    async login(ctx, id, passwd) {
        const key = 'ID_'+id;
        let result = '';
        const check = await ctx.stub.getState(key);
        if(!check || check.length === 0) {
            result = `noid`;
            return result;
        }

        const userData = JSON.parse(check.toString());
        if(passwd != userData['passwd']) {
            result = 'fail';
            return result;
        }
        else {
            result = 'success';
            return result;
        }
    }

    async createNewVotingroom(ctx, title, candidateList, endtime) {
        
        const key = 'votingList';
        const title_key = 'candidate_' + title;
        const voteListBytes = await ctx.stub.getState(key); // get the car from chaincode state
        
        const voteList = JSON.parse(voteListBytes.toString());
        voteList[title] = endtime;
        // const candidateListTemp = JSON.parse(candidateList);

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(voteList)));
        await ctx.stub.putState(title_key, Buffer.from(candidateList));
        console.info('============= END : changeCarOwner ===========');
    }
    
    // async closeVotingroom(ctx,title,passwd) {
    //     const key = 'votingList';

    //     const voteListbytes = await ctx.stub.getState(key);

    //     if (!voteListBytes || voteListBytes.length === 0) {
    //         throw new Error(`${carNumber} does not exist`);
    //     }

    //     const voteList = JSON.parse(voteListBytes.toString());
    //     if(voteList[title][1] == passwd) {
    //         voteList[title][0] = 'end';
    //         await ctx.stub.putState(key, Buffer.from(JSON.stringify(voteList)));
    //     }
    //     else {
    //         throw new Error(`${passwd} is not matched`);
    //     }
    // }

    async queryMyVote(ctx, title, id, code) {
        const idinfobytes = await ctx.stub.getState('ID_' + id);
        const idinfo = JSON.parse(idinfobytes.toString());
        const userSsn = idinfo['userSsn'];

        const codeSSN = code + userSsn;
        let shasum = crypto.createHash('sha1');
        shasum.update(codeSSN);

        //const Key = Name+voteSSN
        const Key = 'vote_' + title+ '_'+shasum.digest('hex');

        console.info(Key);

        const myVotebytes = await ctx.stub.getState(Key);
        const myVote = JSON.parse(myVotebytes.toString());       
        
        return myVote;
    }

    async queryProgressList(ctx) {
        const currentTime = new Date().getTime();
        const key = 'votingList';
        const voteListBytes = await ctx.stub.getState(key);
        const voteList = JSON.parse(voteListBytes.toString());
        const titleList = Object.keys(voteList)
        let progressList = [];
        for(let i=0; i< titleList.length;++i) {
            if(parseInt(voteList[titleList[i]]) > currentTime) {
                progressList.push(titleList[i]);
            }
        }

        console.info(progressList);

        return JSON.stringify(progressList);
    }

    async queryEndList(ctx) {
        const currentTime = new Date().getTime();
        const key = 'votingList';
        const voteListBytes = await ctx.stub.getState(key);
        const voteList = JSON.parse(voteListBytes.toString());
        const titleList = Object.keys(voteList)
        let endList = [];
        for(let i=0; i< titleList.length;++i) {
            if(parseInt(voteList[titleList[i]]) <= currentTime) {
                endList.push(titleList[i]);
            }
        }

        console.info(endList);

        return JSON.stringify(endList);
    }

    // async queryCandidate(ctx, candidateNumber) {
    //     const candidateAsBytes = await ctx.stub.getState(candidateNumber); // get the car from chaincode state
    //     if (!candidateAsBytes || candidateAsBytes.length === 0) {
    //         throw new Error(`${candidateNumber} does not exist`);
    //     }
    //     console.log(candidateAsBytes.toString());
    //     return candidateAsBytes.toString();
    // }

    async createVote(ctx, id, Symbol, Name, Belong, code, title) {
        console.info('============= START : Create Vote ===========');

        const currentTime = new Date().getTime();
       

        const idinfobytes = await ctx.stub.getState('ID_' + id);
        const idinfo = JSON.parse(idinfobytes.toString());
        const userSsn = idinfo['userSsn'];

        const checkVote = 'check_' + userSsn+title;

        const User = {
            id,
        };

        const temp = await ctx.stub.getState('votingList');
        const voteList = JSON.parse(temp.toString());

        if(parseInt(voteList[title]) <= currentTime) {
            throw new Error(`${title} is over`);
        }

        const userAsBytes = await ctx.stub.getState(checkVote);
          
        if (!(!userAsBytes || userAsBytes.length === 0)) {
            throw new Error(`${userSsn} exist`);
        }

        await ctx.stub.putState(checkVote, Buffer.from(JSON.stringify(User)));
        
        const Vote = {
             Symbol,
             Belong,
             Name,
        };


        const codeSSN = code + userSsn;
        let shasum = crypto.createHash('sha1');
        shasum.update(codeSSN);

        //const Key = Name+voteSSN
        const Key = 'vote_' + title+ '_'+shasum.digest('hex');

        await ctx.stub.putState(Key, Buffer.from(JSON.stringify(Vote)));

        console.info('============= END : Create Vote ===========');
    }

    async queryAllData(ctx) {
        const startKey = '';
        const endKey = '';

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        const allResults = [];
        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString('utf8'));

                const Key = res.value.key;
                let Record;
                try {
                    Record = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    Record = res.value.value.toString('utf8');
                }
                allResults.push({ Key, Record });
            }
            if (res.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allResults);
                return JSON.stringify(allResults);
            }
        }
    }

    async queryAllCandidate(ctx, title) {
        const temp = await ctx.stub.getState('candidate_' + title);
        // const res = await ctx.stub.getState(title);
        // const result = data.value.value.toString('utf8')

        if(!temp || temp.length === 0 ) {
            throw new Error(`${title} does not exist`);
        }
        

        return temp.toString();
    }

    async queryEndtime(ctx, title) {
        const key = 'votingList';
        const voteListBytes = await ctx.stub.getState(key);
        const voteList = JSON.parse(voteListBytes.toString());
        // const res = await ctx.stub.getState(title);
        // const result = data.value.value.toString('utf8')

        const result = voteList[title]
        

        return result.toString();
    }

    async queryCurrentSituation(ctx, title) {
        let candidate = await ctx.stub.getState('candidate_' + title);
        const candidateList = JSON.parse(candidate);
        console.info(candidateList);
        
        let statics = [];
        
        for (let i = 0; i < candidateList.length; ++i) {
            let data = {}
            data['name'] = candidateList[i].Name;
            data['symbol'] = candidateList[i].Symbol;
            data['belong'] = candidateList[i].Belong;
            data['count'] = 0;
            statics.push(data);
        }

        console.info(statics);
        
        const startKey = 'vote_' + title + '_';
        const endKey = 'vote_' + title + '_~';
        
        const iterator = await ctx.stub.getStateByRange(startKey,endKey);
        while (true) {
            const res = await iterator.next();
        
            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString('utf8'));
        
                let Record;
        
                try {
                    Record = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    Record = res.value.value.toString('utf8');
                }
                console.info(Record);
                let index = Record.Symbol -1;
    
                statics[index]['count'] = statics[index]['count'] +1;
            }
        
            if (res.done) {
        
                console.log('end of data');
        
                await iterator.close();
        
                return JSON.stringify(statics);
        
            }
       
       
        }
       
    }

}

module.exports = Vote;
