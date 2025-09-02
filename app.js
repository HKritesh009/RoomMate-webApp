const express = require("express");



// ✅ Connect to MongoDB   and .env file 
require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
    await mongoose.connect(process.env.MONGO_URL);
}

main()
    .then(() => {
        console.log("Database connected successfully");
    })
    .catch((err) => {
        console.error("Error occurred while connecting to DB:", err);
    });



const listings = require("./models/listing.js");
const User = require("./models/user.js"); // User schema
const Booking = require("./models/booking.js"); // mybooking schema

const methodOverride = require("method-override");

//its basically used for passwor
const bcrypt = require("bcrypt");

// For flash messages and session
const session = require("express-session");
const flash = require("connect-flash");

const app = express();

const ejsMate = require("ejs-mate");
app.engine("ejs", ejsMate);

const path = require("path");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method"));

// ✅ Session and flash setup MUST come before routes
app.use(
    session({
        secret: "your-secret-key",
        resave: false,
        saveUninitialized: true,
    })
);

app.use(flash());

// ✅ Global flash variables available in EJS
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});



app.use((req, res, next) => {
    res.locals.currentUser = req.session.user; // or however you store logged-in user
    next();
});







app.get("/", (req, res) => {
    res.redirect("/listings");
});

// middleware!!!

function isLoggedIn(req, res, next) {
    if (!req.session.user) {
        req.session.returnTo = req.originalUrl;
        req.flash("error", "Please login first");
        return res.redirect("/listings/auth");
    }
    next();
}


// 🔍 Search Listings
app.get("/listings/search", async (req, res) => {
    const { title, country, location } = req.query;
    let query = {};
    if (title) query.title = new RegExp(title, "i");
    if (country) query.country = new RegExp(country, "i");
    if (location) query.location = new RegExp(location, "i");

    const Listings = await listings.find(query);
    if (Listings.length === 0) {
        return res.status(404).render("listings/Notfound");
    }
    res.render("listings/index", { Listings });
});

// 🌍 All listings
app.get("/listings", async (req, res) => {
    const Listings = await listings.find({});
    res.render("listings/index.ejs", { Listings });
});

// about 
app.get('/about', (req, res) => {
    res.render('about/about.ejs');
});


app.get("/logout", (req, res) => {
    // Flash the message **before** destroying session
    req.flash("success", "Logged out successfully!");

    // Destroy session
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.redirect("/listings");
        }
        // Redirect after flash
        res.redirect("/listings");
    });
});

// app.get("/logout", (req, res) => {
//   req.session.destroy((err) => {
//     if (err) {
//       console.error("Logout error:", err);
//       return res.redirect("/listings");
//     }
//     res.clearCookie("connect.sid");
//     req.flash("success", "Logged out successfully");
//     res.redirect("/listings");
//   });
// });




// 🔐 Login/Register Page
app.get("/listings/auth", (req, res) => {
    res.render("auth/loginsign.ejs");
});

// 🔑 Login Route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });  // This will now include createdAt
        if (!user) {
            req.flash("error", "User not found!");
            return res.redirect("/listings/auth");
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash("error", "Invalid password!");
            return res.redirect("/listings/auth");
        }

        // Store full user info in session (not just ID)
        req.session.user = {
            id: user._id,    //user.id for getting id 
            username: user.username,
            email: user.email,
            createdAt: user.createdAt   // Include this explicitly
        };
        // Redirect back if returnTo exists
        const redirectUrl = req.session.returnTo || "/listings";
        delete req.session.returnTo;

        req.flash("success", "Logged in successfully!");
        res.redirect(redirectUrl);

    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong.");
        res.redirect("/listings/auth");
    }
});

// 📝 Register Route
app.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        // Check for duplicate email
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            req.flash("error", "Email already in use.");
            return res.redirect("/listings/auth");
        }
        // Check for duplicate username
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            req.flash("error", "Username already taken.");
            return res.redirect("/listings/auth");
        }

        const user = new User({ username, email, password });
        await user.save();

        req.flash("success", "Registered successfully!");
        res.redirect("/listings/auth");
    } catch (err) {
        console.error(err);
        req.flash("error", "Registration failed. Please try again.");
        res.redirect("/listings/auth");
    }
});


// ➕ Create new listing
app.post("/listings", async (req, res) => {
    const { listing } = req.body;           // destructure `listing` from body
    listing.owner = req.session.user.id;   // attach current user
    const newlist = new listings(listing);  // pass only the listing data
    await newlist.save();
    req.flash("success", "Listing created!");
    res.redirect("/listings");
});


// 🗑 Delete listing
app.delete("/listings/:id", async (req, res) => {
    let { id } = req.params;
    await listings.findByIdAndDelete(id);
    req.flash("success", "Listing deleted.");
    res.redirect("/listings");
});

// 🆕 Form for new listing
app.get("/listings/new", isLoggedIn, (req, res) => {
    console.log("User ID from session:", req.session.user_id);
    res.render("listings/new");
});

app.get("/listings/auth", (req, res) => {
    res.render("auth/loginPage.ejs", { messages: req.flash(), user: req.session.user });
});


// ✏️ Edit form
app.get("/listings/:id/edit", async (req, res) => {
    let { id } = req.params;
    const list = await listings.findById(id);
    res.render("listings/edit.ejs", { list });
});

// 💾 Update listing
app.put("/listings/:id", async (req, res) => {
    let { id } = req.params;
    await listings.findByIdAndUpdate(id.trim(), req.body);
    req.flash("success", "listing updated.");
    res.redirect(`/listings/${id.trim()}`);
});

// 📄 Show listing
// app.get("/listings/:id", async (req, res) => {
//   const { id } = req.params;
//   const list = await listings.findById(id);
//   res.render("listings/show", { list });
// });

app.get("/listings/:id", async (req, res) => {
    const { id } = req.params;
    const list = await listings.findById(id).populate("owner");
    res.render("listings/show", { list, currentUser: req.session.user });
});



app.get("/listings/book/:id", async (req, res) => {
    if (!req.session.user) {
        req.flash("error", "You must be logged in.");
        return res.redirect("/listings/auth");
    }
    try {
        const { id } = req.params;  // listing id 
        const currentUser = req.session.user.id;  // user id;
        const currentUsername = req.session.user.username;

        const newBooking = new Booking({
            user: currentUser,
            username: currentUsername,
            listing: id
            // bookedDate will default to now
        });

        await newBooking.save();
        req.flash("success", "Booking successful!");
        res.redirect(`/listings/${id.trim()}`);
    }
    catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong.");
        res.redirect("/listings");
    }
});


// user 
app.get("/user/dashboard", (req, res) => {
    if (!req.session.user) {
        req.flash("error", "You must be logged in.");
        return res.redirect("/listings/auth");
    }
    res.render("user/dashboard", { currentUser: req.session.user });
});
app.get("/user/profile", (req, res) => {
    if (!req.session.user) {
        req.flash("error", "You must be logged in.");
        return res.redirect("/listings/auth");
    }
    res.render("user/profile", { currentUser: req.session.user });
});
app.get("/user/mylistings", async (req, res) => {
    if (!req.session.user) {
        req.flash("error", "You must be logged in.");
        return res.redirect("/listings/auth");
    }
    const userId = req.session.user.id; // this is the logged-in user's id
    const Listings = await listings.find({ owner: userId });
    res.render("user/mylistings", { Listings });
});

app.get("/user/mybookings", async (req, res) => {
    if (!req.session.user) {
        req.flash("error", "You must be logged in.");
        return res.redirect("/listings/auth");
    }
    const userId = req.session.user.id;
    const bookings = await Booking.find({ user: userId })
        .populate('listing', 'title location country')
        .populate('user', 'username');  // matches the Booking schema

    res.render("user/mybookings", { bookings });
});



app.get("/user/changepassword", (req, res) => {
    if (!req.session.user) {
        req.flash("error", "You must be logged in.");
        return res.redirect("/listings/auth");
    }
    res.render("user/changepassword", { currentUser: req.session.user });
});


//change password functionality
app.post("/user/changepassword", async (req, res) => {
    if (!req.session.user) {
        req.flash("error", "You must be logged in.");
        return res.redirect("/listings/auth");
    }
    const { currentPassword, newPassword } = req.body;
    try {
        const currentUser = await User.findById(req.session.user.id);
        const isMatch = await bcrypt.compare(currentPassword, currentUser.password);

        if (!isMatch) {
            req.flash("error", "Old password is incorrect.");
            return res.redirect("/user/changepassword");
        }
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        currentUser.password = newPassword;  // raw password
        await currentUser.save();

        req.flash("success", "Password updated successfully.");
        res.redirect("/user/changepassword");
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong.");
        res.redirect("/user/changepassword");
    }
});



app.get("/user/deleteaccount", (req, res) => {
    if (!req.session.user) {
        req.flash("error", "You must be logged in.");
        return res.redirect("/listings/auth");
    }


    res.render("user/deleteaccount", { currentUser: req.session.user });
});

app.delete("/user/delete", async (req, res) => {
    if (!req.session.user) {
        req.flash("error", "You must be logged in.");
        return res.redirect("/listings/auth");
    }
    const userId = req.session.user.id; // or req.session.user._id

    // Delete all listings of this user
    await listings.deleteMany({ owner: userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    //  destroy session
    req.session.destroy();
})

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log("Listening at port 3000");
});
