import "server-only"

import {
    unstable_cache as cache,
    unstable_noStore as noStore,
} from "next/cache"
import { connectDb } from "../db"
import { FilterQuery } from "mongoose"
import { ApiResponse } from "@/helpers/api-response"
import CategoryModel from "../db/models/category-model"
import { getProductsSchema } from "@/lib/validations/product"
import SubcategoryModel, { ISubcategory } from "../db/models/subcategory-model"
import ProductModel, { IProduct } from "../db/models/product-model"


// get products
export async function getProducts(input: SearchParams) {
    await connectDb()
    noStore()

    try {
        const limit = Number(input.per_page) || 10;
        const page = Number(input.page) || 1;
        const skip = (page - 1) * limit;
        const search = getProductsSchema.parse(input)

        const [sortField, sortOrder] = (search.sort?.split('.') as [
            keyof IProduct | undefined, 'asc' | 'desc' | undefined
        ]) ?? ['createdAt', 'desc'];

        const categoryIds = search.categories?.split(".") ?? []
        const subcategoryIds = search.subcategories?.split(".") ?? []
        const [minPrice, maxPrice] = search.price_range?.split("-") ?? []

        const filter: FilterQuery<IProduct> = {};

        if (categoryIds.length > 0) {
            filter.categoryId = { $in: categoryIds };
        }
        if (subcategoryIds.length > 0) {
            filter.subcategoryId = { $in: subcategoryIds };
        }
        if (minPrice !== undefined) {
            filter.price = { ...filter.price, $gte: minPrice };
        }
        if (maxPrice !== undefined) {
            filter.price = { ...filter.price, $lte: maxPrice };
        }

        const products = await ProductModel.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $lookup: {
                    from: 'subcategories',
                    localField: 'subcategoryId',
                    foreignField: '_id',
                    as: 'subcategory'
                }
            },
            { $unwind: '$subcategory' },
            {
                $project: {
                    id: '$_id',
                    name: 1,
                    description: 1,
                    images: 1,
                    category: '$category.name',
                    subcategory: '$subcategory.name',
                    price: 1,
                    inventory: 1,
                    createdAt: 1,
                    updatedAt: 1,
                }
            },
            { $sort: { [sortField as string]: sortOrder === 'asc' ? 1 : -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        const total = await ProductModel.countDocuments(filter);
        const pageCount = Math.ceil(total / limit);

        return {
            data: products,
            pageCount,
        };
    } catch (err) {
        return {
            data: [],
            pageCount: 0,
        }
    }
}


// get featured products
export async function getFeaturedProducts() {
    await connectDb()

    return await cache(
        async () => {
            return ProductModel.find({}).limit(8).sort({ createdAt: -1 });
        },
        ["featured-products"],
        {
            revalidate: 3600,
            tags: ["featured-products"],
        }
    )()
}


// get product count by category
export async function getProductCountByCategory({ categoryId }: { categoryId: string }) {
    await connectDb()

    return await cache(
        async () => {
            return ProductModel.countDocuments({ 'category.id': categoryId });
        },
        [`product-count-${categoryId}`],
        {
            revalidate: 3600,
            tags: [`product-count-${categoryId}`]
        }
    )()
}


// get categories
export async function getCategories() {
    await connectDb()

    return await cache(
        async () => {
            return CategoryModel.aggregate([
                {
                    $project: {
                        _id: 0,
                        id: 1,
                        name: 1,
                        slug: 1,
                        description: 1,
                        image: 1
                    }
                },
                {
                    $sort: { name: -1 }
                }
            ]);
        },
        ["categories"],
        {
            revalidate: 3600,
            tags: ["categories"],
        }
    )()
}


// get product by id
export async function getProductById(productId: string) {
    await connectDb()

    return await cache(
        async () => {
            return ProductModel.findById(productId);
        },
        [`product-${productId}`],
        {
            revalidate: 3600,
            tags: [`product-${productId}`],
        }
    )()
}

// get related products
export async function getRelatedProducts(productId: string) {
    await connectDb();

    return await cache(
        async () => {
            const product = await ProductModel.findById(productId).select('categoryId subCategoryId');
            if (!product) {
                return [];
            }

            return ProductModel.find({
                $or: [
                    { categoryId: product.categoryId },
                    { subCategoryId: product.subCategoryId }
                ]
            }).limit(4).sort({ createdAt: -1 });
        },
        [`related-products-${productId}`],
        {
            revalidate: 3600,
            tags: [`related-products-${productId}`],
        }
    )()
}

// filter category product
export type SearchParams = {
    sex?: string;
    gte?: string;
    lte?: string;
    subcategory?: string;
    [key: string]: string | string[] | undefined;
};

export async function getProductsByCategory(category: string, searchParams: SearchParams) {
    await connectDb();

    const { sex, subcategory, gte, lte } = searchParams;

    const matchConditions: any = {
        'category.slug': category,
    };

    if (sex) matchConditions.sex = sex;
    if (subcategory) matchConditions['subCategory.slug'] = subcategory;

    if (gte || lte) {
        matchConditions.price = {};
        if (gte) matchConditions.price.$gte = parseFloat(gte);
        if (lte) matchConditions.price.$lte = parseFloat(lte);
    }

    // Generate a dynamic cache key based on all search parameters
    const cacheKey = `products-${category}-${sex || ''}-${subcategory || ''}-${gte || ''}-${lte || ''}`;

    const result = await cache(
        async () => {
            try {
                const products = await ProductModel.find(matchConditions)
                    .sort({ createdAt: -1 })
                    .lean()
                    .exec();

                return ApiResponse.success(`Successfully fetched products for category: ${category}`, products as IProduct[]);
            } catch (err: any) {
                return ApiResponse.failure(err.message);
            }
        },
        [cacheKey],
        {
            revalidate: 3600,
            tags: [
                `products-${category}`,
                ...Object.entries(searchParams).map(
                    ([key, value]) => `products-${category}-${key}-${value}`
                ),
            ],
        }
    )();

    return result;
}


// get all subcategories
export async function getSubCategoriesOfCategory(slug: string) {
    await connectDb()

    const result = await cache(
        async () => {
            try {
                const categories = await SubcategoryModel.find({ "category.slug": slug }).lean().exec();
                return ApiResponse.success("Fetched subcategories!", categories as ISubcategory[])
            } catch (err: any) {
                return ApiResponse.failure(err.message)
            }
        },
        ["subcategories"],
        {
            revalidate: 3600,
            tags: ["subcategories"],
        }
    )()

    return result;
}