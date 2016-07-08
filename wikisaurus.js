/* Node.js-skript för att hämta antonymer och synonymer från Wikisaurus */
/* Programmet använder en del finesser i ECMAscript 6, 
   kör med argument --harmony_destructuring i äldre versioner av Node. */
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
//var term='ugly'
var thesaurus={'synonyms':['NOT_READY'], 'antonyms':['NOT_READY']}

function getThesaurus(error,res,body) {
	//console.log('----getThesaurus----')
	thesaurus={'synonyms':[], 'antonyms':[]}
	if (!error && res.statusCode===200) {
		//console.log(body)
		//console.log(body.query)
		//console.log(body.query.pages)
		var pageid=Object.keys(body.query.pages)[0]
		if(pageid=='-1') {
			console.log('Ordet saknas i Wikisaurus!')
			API_OK=false
			return
		}
		API_OK=true
		var wikitext=body.query.pages[pageid].revisions[0]['*']
		//console.log(wikitext)
		//var wikitree=wikitext.split('=====')
		var wikitree=wikitext.split('=')
		//console.log(wikitree)
		wikitree=wikitree.filter(function(node){return node>''})
		//console.log(wikitree)
		for(nr in wikitree) {
			var leaf=wikitree[nr]
			var kindOfNym=leaf.trim().toLowerCase()
			if(kindOfNym=='antonyms' || kindOfNym=='synonyms') {
				nr++
				var list=wikitree[nr].trim()
				if(list.startsWith('{{ws beginlist}}')) {
					//console.log('Hittade lista')
					//var list=terms.match(/[^\n]\w+/g)
					//var list=terms.match(/\w+/g)
					//var list=antos.match(/[^\n{}'ws'' '|]\w+/g)
					//var terms=list.match(/[^({|\s|ws)]\w+-?\w+/g)
					var terms=list.match(/[^({|\s|(ws))]\w+-?\w+/g)
					//var terms=list.match("s/ws/h/g")
					console.log(terms)
					if(terms.shift()=='beginlist') {
						//console.log('Hittade början på lista')
					}
					else {
						console.log('Listan var ingen giltig lista')
						console.log(terms)
						API_OK=false
						return
					}
					if(terms.pop()=='endlist') {
						//console.log('Hittade slut på lista')
					}
					else{
						console.log('Listan var ingen giltig lista')
						console.log(terms)
						API_OK=false
						return
					}
					if(Array.isArray(terms)) {
						//console.log(terms)
						thesaurus[kindOfNym]=terms
					}
					else{
						console.log('Hittade inga antonymer/synonymer')
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

//server.get('/html',(req,res) => {
server.get('/',(req,res) => {
	console.log('Anrop mot /')
	fs.readFile('./jquery-localhost.html', (error,content) => {
		if(error) {
			console.log('Kom inte åt html-filen')
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

server.get('/old',(req,res) => {
	console.log('Anrop mot /')
	console.log('wikiurl='+baseURL+apiURL+term)
	var bla=requester({
		url:baseURL+apiURL+term,
		json: true
		},getThesaurus)
	res.header("Access-Control-Allow-Origin", "*")
	res.header("Content-type", "application/json")
	res.write(JSON.stringify(thesaurus))
	res.end()
})

server.get('/antonym',(req,res) => {
	console.log('Anrop mot /antonym')
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
	console.log('Anrop mot /synonym')
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
	console.log('Anrop mot /opposites')
	if(!checkParams(req)) {return}
	res=prepareResponse(res)
	promiser(baseURL+apiURL+term,res).then( ({res:res,body:data}) => {
		getThesaurus(false,res,data)
		var name=''
		if(thesaurus.synonyms.length>0 && thesaurus.antonyms.length>0) {
			console.log('Ordlistan hittades')
			name+=getRandomTerm('synonyms')
			name+='-'
			name+=getRandomTerm('antonyms')
		}
		console.log('motsatspar: '+name)
		res.json({'name':name}).end()
	},(err) => {
		console.error('%s; %s,err.message, url')
	})
})

server.get('/all',(req,res) => {
	console.log('Anrop mot /all')
	if(!checkParams(req)) {return}
	res=prepareResponse(res)
	promiser(baseURL+apiURL+term,res).then( ({res:res,body:data}) => {
		getThesaurus(false,res,data)
		res.json(thesaurus).end()
	},(err) => {
		console.error('%s; %s,err.message, url')
	})
})

server.get('/whois',(req,res) => {
	requester({url:'https://jsonwhois.com/api/v1/whois'})
})

function promiser(url,reply) {
	return new Promise((resolve,reject) => {
		requester({url:url,json:true}, (err,res,body) => {
			if(err) {
				return reject(err)
			}
			else if (res.statusCode !== 200) {
				err=new Error("Mottog felkod: "+res.statusCode)
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
	console.log('Parametrar: '+JSON.stringify(req.query))
	switch(req.query.term) {
		case undefined:
			console.log('Ogiltigt anrop')
			return false
		case '':
			console.log('Tomt sökord')
			return false
		default:
			term=req.query.term
			return true
	}
}
function getRandomTerm(kindOfNym) {
	console.log(JSON.stringify(thesaurus))
	console.log('kindOfNym='+kindOfNym)
	console.log('ordlista: '+thesaurus[kindOfNym])
	var randomTerm=thesaurus[kindOfNym][Math.floor(Math.random()*thesaurus[kindOfNym].length)]
	console.log('Slumpade '+kindOfNym+': '+randomTerm)
	return randomTerm
}
server.get('/random',(req,res) => {
	console.log('Anrop mot /random')
	
})
/* res.json() skickar ett JSON-svar */

server.listen(port)
console.log('Servern uppe på port '+port)