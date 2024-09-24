import { initializeApp } from "https://www.gstatic.com/firebasejs/9.4.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC2Jhg-a749NWFMYUPgDMuKv47SqykTIBU",
    authDomain: "mingdevelopment-site.firebaseapp.com",
    projectId: "mingdevelopment-site",
    storageBucket: "mingdevelopment-site.appspot.com",
    messagingSenderId: "800392654260",
    appId: "1:800392654260:web:908a7d6394f05e6ae016e1",
    measurementId: "G-ZN0WEHH01J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

(function($) {
    "use strict";

    // Initialize the calendar on document ready
    $(document).ready(async function() {
        const date = new Date();
        const today = date.getDate();
        const currentMonth = date.getMonth() + 1;
        const currentYear = date.getFullYear();

        // Set click handlers for calendar navigation
        $(".right-button").click({date: date}, next_year);
        $(".left-button").click({date: date}, prev_year);
        $(".month").click({date: date}, month_click);
        
        // Set click handler for adding a new event
        $("#add-button").click(function() {
            // Get values from input fields (you should have input fields in your HTML for these)
            const description = $("#event-name").val().trim();  // Example input field: <input id="event-name" />
            const invited_count = parseInt($("#invited-count").val()); // Example input field: <input id="invited-count" />
            
            // Get selected date from the calendar (e.g., the active date)
            const selectedDay = parseInt($(".active-date").text());  // This assumes the active date is selected and has a class of 'active-date'

            if (description && !isNaN(invited_count) && selectedDay) {
                // Create the new event
                create_new_event(currentYear, currentMonth, selectedDay, description, invited_count);
            } else {
                alert("Please fill out all event details.");
            }
        });

        // Mark current month as active
        $(".months-row").children().eq(date.getMonth()).addClass("active-month");

        // Initialize the calendar and load events
        init_calendar(date);
        const events = await get_events_from_firestore(currentYear, currentMonth, today);
        show_events(events, months[date.getMonth()], today);
    });

    // Function to initialize the calendar
    function init_calendar(date) {
        $(".tbody").empty();
        $(".events-container").empty();
        const calendar_days = $(".tbody");
        const month = date.getMonth();
        const year = date.getFullYear();
        const day_count = days_in_month(month, year);
        let row = $("<tr class='table-row'></tr>");
        const today = date.getDate();
        
        date.setDate(1);
        const first_day = date.getDay();

        for(let i = 0; i < 35 + first_day; i++) {
            const day = i - first_day + 1;
            if(i % 7 === 0) {
                calendar_days.append(row);
                row = $("<tr class='table-row'></tr>");
            }

            if(i < first_day || day > day_count) {
                row.append($("<td class='table-date nil'></td>"));
            } else {
                const curr_date = $("<td class='table-date'>" + day + "</td>");
                curr_date.click({day: day, month: months[month]}, date_click);
                row.append(curr_date);
            }
        }
        calendar_days.append(row);
        $(".year").text(year);
    }

    // Get events from Firestore
    async function get_events_from_firestore(year, month, day) {
        const selectedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const docRef = doc(db, 'rec_mar', 'listas', 'dayToDay-2024', selectedDate);

        try {
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().events || [] : [];
        } catch (error) {
            console.error("Error retrieving events:", error);
            return [];
        }
    }

    // Function to display events in card views
    function show_events(events, month, day) {
        $(".events-container").empty().show(250);

        if(events.length === 0) {
            $(".events-container").append(
                `<div class='event-card'><div class='event-name'>No hay eventos registrados para el ${month} ${day}.</div></div>`
            );
        } else {
            events.forEach(event => {
                const eventCard = `<div class='event-card'>
                    <div class='event-name'>${event.description}</div>
                    <div class='event-count'>${event.person || 'Sin invitados'}</div>
                </div>`;
                $(".events-container").append(eventCard);
            });
        }
    }

    // Utility functions and event handlers

    function days_in_month(month, year) {
        return new Date(year, month + 1, 0).getDate();
    }

    function date_click(event) {
        const { day, month } = event.data;
        $(".active-date").removeClass("active-date");
        $(this).addClass("active-date");

        get_events_from_firestore(new Date().getFullYear(), new Date().getMonth() + 1, day)
            .then(events => show_events(events, month, day));
    }

    function month_click(event) {
        const date = event.data.date;
        $(".active-month").removeClass("active-month");
        $(this).addClass("active-month");
        date.setMonth($(".month").index(this));
        init_calendar(date);
    }

    function next_year(event) {
        const date = event.data.date;
        date.setFullYear(date.getFullYear() + 1);
        init_calendar(date);
    }

    function prev_year(event) {
        const date = event.data.date;
        date.setFullYear(date.getFullYear() - 1);
        init_calendar(date);
    }

    // Function to create a new event in Firestore
    async function create_new_event(year, month, day, description, invited_count) {
        // Create the document ID using the date format (e.g., "2024-09-23")
        const selectedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        // Reference to the document in Firestore for the selected day
        const docRef = doc(db, 'rec_mar', 'listas', 'dayToDay-2024', selectedDate);

        // Define the new event
        const newEvent = {
            date: new Date(year, month - 1, day), // Firestore expects a Date object, month is 0-indexed
            person: invited_count,
            description: description
        };

        try {
            // Add the new event to the 'events' array in the document using arrayUnion (merge)
            await updateDoc(docRef, {
                events: arrayUnion(newEvent) // Ensure 'events' is an array of events in the document
            });
            console.log("Event successfully added!");
        } catch (error) {
            console.error("Error adding event: ", error);
        }
    }

    const months = [ 
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre" 
    ];

})(jQuery);
