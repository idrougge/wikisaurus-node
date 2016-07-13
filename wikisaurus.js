/* Node.js script for fetfching synonyms and antonyms from Wikisaurus */
/* The program uses some features of ECMAscript 6, run with argument 
   --harmony_destructuring in older versions of Node. */
const express=require('express')
const server=express()
const Promise=require('promise')
const fs=require('fs')
const helmet=require('helmet')
server.use(helmet())
var requester=require('request')
const port=process.env.PORT || 8124
const baseURL='http://en.wiktionary.org'
const apiURL='/w/api.php?format=json&action=query&prop=revisions&rvprop=content&titles=Wikisaurus:'
var API_OK=false
var term='lazy'
var thesaurus={'synonyms':['NOT_READY'], 'antonyms':['NOT_READY']}

function getThesaurus(error,res,body) {
	thesaurus={'synonyms':[], 'antonyms':[]}
	if (!error && res.statusCode===200) {
		var pageid=Object.keys(body.query.pages)[0]
		if(pageid=='-1') {
			console.log('Term is missing from Wikisaurus!')
			API_OK=false
			return
		}
		API_OK=true
		var wikitext=body.query.pages[pageid].revisions[0]['*']
		var wikitree=wikitext.split('=')
		wikitree=wikitree.filter(function(node){return node>''})
		for(nr in wikitree) {
			var leaf=wikitree[nr]
			var kindOfNym=leaf.trim().toLowerCase()
			if(kindOfNym=='antonyms' || kindOfNym=='synonyms') {
				nr++
				var list=wikitree[nr].trim()
				if(list.startsWith('{{ws beginlist}}')) {
					var terms=list.match(/[^\{\s\}"ws(\s|\|)"](\w|-|\s)+/g)
					if(terms.shift()=='beginlist') {
					}
					else {
						API_OK=false
						return
					}
					if(terms.pop()=='endlist') {
					}
					else{
						API_OK=false
						return
					}
					if(Array.isArray(terms)) {
						thesaurus[kindOfNym]=terms
					}
					else{
						console.log('Found no antonyms/synonyms')
						API_OK=false
						return
					}
				}
			}
		}
	}
	else {
		console.log('error: '+error)
		API_OK=false
	}
}

server.get('/',(req,res) => {
	fs.readFile('./jquery-localhost.html', (error,content) => {
		if(error) {
			console.log("Could not reach html file")
			res.writeHead(500)
			res.end()
		}
		else {
			res.writeHead(200,{'Content-type':'text/html'})
			res.write(content,'utf-8')
			res.end()
		}
	})
})

server.get('/antonym',(req,res) => {
	if(!checkParams(req)) {return}
	res=prepareResponse(res)
	promiser(baseURL+apiURL+term,res).then( ({res:res,body:data}) => {
		getThesaurus(false,res,data)
		randomTerm={'antonyms':getRandomTerm('antonyms')}
		res.write(JSON.stringify(randomTerm))
		res.end()
	},(err) => {
		console.error("%s; %s", err.message, url);
    	console.log("%j", err.res.statusCode);
	})
})

server.get('/synonym',(req,res) => {
	if(!checkParams(req)) {return}
	res=prepareResponse(res)
	promiser(baseURL+apiURL+term,res).then( ({res:res,body:data}) => {
		getThesaurus(false,res,data)
		randomTerm={'synonyms':getRandomTerm('synonyms')}
		res.json(randomTerm).end()
	},(err) => {
		console.error('%s; %s,err.message, url')
	})
})

server.get('/opposites',(req,res) => {
	if(!checkParams(req)) {return}
	res=prepareResponse(res)
	promiser(baseURL+apiURL+term,res).then( ({res:res,body:data}) => {
		getThesaurus(false,res,data)
		var name=''
		if(thesaurus.synonyms.length>0 && thesaurus.antonyms.length>0) {
			name+=getRandomTerm('synonyms')
			name+='-'
			name+=getRandomTerm('antonyms')
		}
		res.json({'name':name}).end()
	},(err) => {
		console.error('%s; %s,err.message, url')
	})
})

server.get('/all',(req,res) => {
	if(!checkParams(req)) {return}
	res=prepareResponse(res)
	promiser(baseURL+apiURL+term,res).then( ({res:res,body:data}) => {
		getThesaurus(false,res,data)
		res.json(thesaurus).end()
	},(err) => {
		console.error('%s; %s,err.message, url')
	})
})

function promiser(url,reply) {
	return new Promise((resolve,reject) => {
		requester({url:url,json:true}, (err,res,body) => {
			if(err) {
				return reject(err)
			}
			else if (res.statusCode !== 200) {
				err=new Error("Received error: "+res.statusCode)
				err.res=res
				return reject(err)
			}
			resolve({res:reply,body:body})
		})
	})
}

function prepareResponse(res) {
	res.header("Access-Control-Allow-Origin", "*")
	res.header("Content-type", "application/json")
	return res
}

function checkParams(req) {
	console.log('Parameters: '+JSON.stringify(req.query))
	switch(req.query.term) {
		case undefined:
			console.log('Illegal request')
			return false
		case '':
			console.log('Empty search term')
			return false
		default:
			term=req.query.term
			return true
	}
}
function getRandomTerm(kindOfNym) {
	console.log(JSON.stringify(thesaurus))
	var randomTerm=thesaurus[kindOfNym][Math.floor(Math.random()*thesaurus[kindOfNym].length)]
	return randomTerm
}
server.listen(port)
console.log('Server running on port '+port)