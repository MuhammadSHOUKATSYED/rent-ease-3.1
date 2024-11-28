import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import {AntDesign} from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Listings() {
	const router = useRouter();

	return (
		<View className="flex-1 bg-white">
			{/* Header */}
			<View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white mt-8">
				<Text className="text-lg font-semibold" style={{ fontSize: 25}}>My Listings</Text>
			</View>

			{/* No Messages Section */}
			<ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
			<AntDesign name="shoppingcart" size={80} color="black" />
				<Text className="text-xl font-semibold mt-4">You don't have rented anything yet?</Text>
				<Text className="text-center mt-2 text-gray-600">
					Start renting your items from now!
				</Text>
				<TouchableOpacity
					className="bg-[#9455f4] px-6 py-3 rounded-full mt-5"
					onPress={() => router.push("/(protected)/rent")}
				>
					<Text className="text-white font-semibold">Add your rentals now</Text>
				</TouchableOpacity>
			</ScrollView>
		</View>
	);
}
