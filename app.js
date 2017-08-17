const express = require('express')
const app = express()
const mysql = require('mysql')
const path = require('path')
const bodyParser = require('body-parser')
const config = require('config')
const session = require('express-session')


const conn = mysql.createConnection({
  host: config.get('db.host'),
  user: config.get('db.user'),
  password: config.get('db.password'),
  database: config.get('db.database')
})

app.use(session({
	secret: 'keyboard cat',
	resave: false, 
	saveUninitialized: true
}))
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())

app.use(express.static(path.join(__dirname, 'static')))




//////Customer to get a current list of all items

app.get("/api/customer/inventory", function(req, res, next){
	const sql =`
	SELECT * FROM inventory
	`
	conn.query(sql, function(err, results, fields){
  
    if(!err){
    res.json({
    	status: "Success!",
    	message: "Hello, here is the current inventory of all items currently in machine.",
    	results: results})
	} else {
		console.log(err)
		res.json({
			status: "Failure",
			message: "Couldn't connect to inventory."
		})
	}
	})
});



//////Vendor adding an item to current list of items. 

app.post("/api/vendor/inventory", function(req,res,next){
	const itemName = req.body.itemName
	const category_id = req.body.category_id
	const quantity = req.body.quantity
	const price = req.body.price

	
	const sql =`
	INSERT INTO inventory (itemName, category_id, quantity, price)
	VALUES (?, ?, ?, ?)
	`
	conn.query(sql, [itemName, category_id, quantity, price], function(err, results, fields){
      if (!err) {
        res.json({
        	status: "Success!",
        	message: "You added an item."
        })
      } else {
        console.log(err)
        res.json({
        	status: "Failure",
        	message: "Item not added."
        })
      }
    })
})


/////Vendor updating an item in the inventory

app.put("/api/vendor/inventory/:id", function(req, res, next){
	const itemName = req.body.itemName
	const category_id = req.body.category_id
	const quantity = req.body.quantity
	const price = req.body.price
	const id = req.params.id

	const sql =`
	UPDATE inventory 
	SET itemName = ?, category_id = ?, quantity = ?, price = ?
	WHERE id = ?
	`
	conn.query(sql, [itemName, category_id, quantity, price, id], function(err, results, fields){
      if (!err) {
        res.json({
        	status: "Success!",
        	message: "You have updated an item.",
        	id: results.insertId
        })
      } else {
        console.log(err)
        res.json({
        	status: "Failure",
        	message: "Item not updated."      	
        })
      }
    })
})


//////////Customer buying an item, holy shit balls./////////////////////


app.post("/api/customer/inventory/:itemId/transaction", function(req, res, next){

const id = req.params.itemId
var money_given = req.body.money

	const selectItem = `
	SELECT id, itemName, price, quantity FROM inventory
	WHERE id = ? AND quantity > 0 `

	const addTrans = `
	INSERT INTO transactions (item_id, item_price, item_quantity)
	VALUES (?, ?, ?)`

	const updateQuantity = `
	UPDATE inventory
	SET quantity = ?
	WHERE id = ?`


	conn.query(selectItem, [id], function(err, results, fields){
		if (!err || results !== undefined) {

       		const items = results[0]
       		var quantity = items.quantity
       		console.log(quantity)

       		if(money_given == items.price){
       			conn.query(addTrans, [items.id, items.price, 1], function(err, results, fields){
       				
       				var updatedQuantity = (quantity - 1)

       				if(!err){
       					conn.query(updateQuantity, [updatedQuantity, items.id], function(err, results, fields){
       							if(err){
       								console.log(err)
       							}
       					})
       					res.json({
       						status: "Success!",
        					message: "Your purchase is complete. Thank you!",
        					id: results.insertId
       					})

       				} else {
       					console.log(err)
        				res.json({
        					status: "Failure",
        					message: "Transaction failed."      	
        				})
        			}
       			})
       			
			} else if(money_given > items.price){
				conn.query(addTrans, [items.id, items.price, 1], function(err, results, fields){
					
					var change = (money_given - items.price)
					var updatedQuantity = (quantity - 1)

       				if(!err){
       					conn.query(updateQuantity, [updatedQuantity, items.id], function(err, results, fields){
       							if(err){
       								console.log(err)
       							}
       					})
       					res.json({
       						status: "Success!",
        					message: "Your purchase is complete. Your change is below. Thank you!",
        					change: change,
        					id: results.insertId
       					})

       				} else {
       					console.log(err)
        				res.json({
        					status: "Failure",
        					message: "Transaction failed."      	
        				})
        			}
       			})

			} else {
				var change = (money_given - items.price)

				res.json({
					status: "Failure",
					message: "Your purchase is incomplete. Add more money listed below. Thank you!",
					short: change
				})
			}
       	} else {

       		res.json({
       			status: "Failure",
       			message: "Error, Item doesn't exist or out of stock."
       		})
       	}
    })
});

//////////Vendor get all transactions///////////////////////////////////////////////

app.get("/api/vendor/transactions", function(req, res, next){
	const sql =`
	SELECT * FROM transactions
	`
	conn.query(sql, function(err, results, fields){
  
    if(!err){
    res.json({
    	status: "Success!",
    	message: "Hello, here are all of the transactions in machine.",
    	results: results})
	} else {
		console.log(err)
		res.json({
			status: "Failure",
			message: "Couldn't connect to your transactions."
		})
	}
	})
});


/////////////Vendor get total of money in machine/////////////////////////////////////

app.get("/api/vendor/money", function(req, res, next){
	const getRevenue = `
	SELECT SUM(item_price) AS Total FROM transactions
	`
	conn.query(getRevenue, function(err, results, fields){

		if(!err){
			res.json({
				status: "Success!",
				message: "Here is your total money in the machine.",
				results: results
			})
		} else {
			console.log(err)
			res.json({
				status: "Failure",
				message: "Couldn't connect to your transactions."
			})
		}
	})
})


app.listen(3000, function(){
  console.log("App running on port 3000")
})