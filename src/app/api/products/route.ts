// Goal: provide a product list for Mountify
// URL:  GET /api/products


import { NextResponse } from "next/server";

// TODO: define a PRODUCTS list，put three fake product in here
// each product contains: id, name, priceCad, car, description
const products = [
    {
        id:1,
        name: "center console case",
        priceCad: 29.9,
        car: "Mazda3 Turbo GT",
        description: "CNC aluminum phone holder"
    },

    {
        id: 2,
        name: "Front Lip Spoiler",
        priceCad: 349.99,
        car: "Mazda3 Turbo GT",
        description: "Aerodynamic front lip designed for better downforce."
    },

     {
        id: 3,
        name: "Short Ram Intake",
        priceCad: 289.99,
        car: "Mazda3 Turbo GT",
        description: "Performance intake kit to enhance turbo response."
    }
    
];

export async function GET() {
// TODO: return JSON，e.g { products: PRODUCTS }
    return NextResponse.json({
        products: products
    });
}
