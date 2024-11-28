import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Text,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { supabase } from "@/config/supabase";
import { useSupabase } from "@/context/supabase-provider";
import { H1 } from "@/components/ui/typography";
import DateTimePicker from "@react-native-community/datetimepicker"; // For date picking
import Icon from "react-native-vector-icons/FontAwesome5"; // Import icons

export default function EditPayment() {
  const { user } = useSupabase();
  const [payment, setPayment] = useState({
    paymentType: "",
    billingAddress: "",
    cardNumber: "",
    cardExpiry: "",
    cardCVC: "",
  });
  const [rewards, setRewards] = useState({ points: 0 }); // Reward points state
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (user?.id) {
      const fetchPaymentDetails = async () => {
        const { data, error } = await supabase
          .from("payment_methods")
          .select("*")
          .eq("userId", user.id)
          .single();

        if (error) {
          // Row does not exist for this user
          Alert.alert("Add Payment Method", "You have not yet updated your payment method");
        } else {
          setPayment({
            paymentType: data?.paymentType || "",
            billingAddress: data?.billingAddress || "",
            cardNumber: data?.cardNumber || "",
            cardExpiry: data?.cardExpiry || "",
            cardCVC: data?.cardCVC || "",
          });
        }
      };

      const fetchRewards = async () => {
        const { data, error } = await supabase
          .from("reward_points")
          .select("points")
          .eq("profile_id", user.id)
          .single();

        if (error) {
          // Row does not exist for this user
          Alert.alert("Remember", "You don't have any points yet.");
        } else {
          setRewards({ points: data?.points || 0 });
        }
      };

      fetchPaymentDetails();
      fetchRewards();
    }
  }, [user?.id]);

  const handleSave = async () => {
    setLoading(true);

    // Save payment details without modifying points (No deduction of points)
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("userId", user?.id)
      .single();

    if (error && error.code !== "PGRST116") {
      Alert.alert("Error", "No existing payment details found for the user.");
      setLoading(false);
      return;
    }

    if (!data) {
      // If no payment details exist, insert a new entry
      const { error: insertError } = await supabase
        .from("payment_methods")
        .insert({
          userId: user.id,
          paymentType: payment.paymentType,
          billingAddress: payment.billingAddress,
          cardNumber: payment.cardNumber,
          cardExpiry: payment.cardExpiry,
          cardCVC: payment.cardCVC,
        });

      if (insertError) {
        Alert.alert("Error adding payment details", insertError.message);
      } else {
        Alert.alert("Payment details added successfully!");
      }
    } else {
      // If payment details exist, update the existing record
      const { error: updateError } = await supabase
        .from("payment_methods")
        .update({
          paymentType: payment.paymentType,
          billingAddress: payment.billingAddress,
          cardNumber: payment.cardNumber,
          cardExpiry: payment.cardExpiry,
          cardCVC: payment.cardCVC,
        })
        .eq("userId", user?.id);

      if (updateError) {
        Alert.alert("Error saving payment details", updateError.message);
      } else {
        Alert.alert("Payment details updated successfully!");
      }
    }

    setLoading(false);
  };

  const handlePaymentTypeChange = (type) => {
    setPayment((prev) => ({
      ...prev,
      paymentType: type,
      cardNumber: "", // Reset card details when switching payment type
      cardExpiry: "",
      cardCVC: "",
    }));
  };

  const showExpiryDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    if (selectedDate) {
      const formattedDate = `${(
        selectedDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${selectedDate.getFullYear().toString().slice(2)}`;
      setPayment((prev) => ({ ...prev, cardExpiry: formattedDate }));
    }
    setShowDatePicker(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f9fafc" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View style={{ marginBottom: 20, alignItems: "center" }}>
          <H1 style={{ fontSize: 24, fontWeight: "bold" }}>Payment Methods</H1>
          <Text style={{ fontSize: 16, color: "#9455f4", marginTop: 5 }}>
            Reward Points: {rewards.points}
          </Text>
        </View>

        {/* Payment Type Selection */}
        {[
          { type: "Direct Bank Transfer", icon: "university" },
          { type: "Credit/Debit Card", icon: "credit-card" },
          { type: "COD", icon: "cash-register" },
          { type: "Easypaisa", icon: "mobile-alt" },
          { type: "JazzCash", icon: "mobile-alt" },
          { type: "Using Points", icon: "gift" },
        ].map(({ type, icon }) => (
          <TouchableOpacity
            key={type}
            style={{
              backgroundColor:
                payment.paymentType === type ? "#9455f4" : "#f3f4f6",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 9999,
              marginVertical: 5,
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={() => handlePaymentTypeChange(type)}
          >
            <Icon
              name={icon}
              size={20}
              color={payment.paymentType === type ? "#fff" : "#000"}
              style={{ marginRight: 10 }}
            />
            <Text
              style={{
                color: payment.paymentType === type ? "#fff" : "#000",
                fontWeight: "600",
              }}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Show fields only if "Credit/Debit Card" is selected */}
        {payment.paymentType === "Credit/Debit Card" && (
          <>
            <TextInput
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg bg-white"
              placeholder="Card Number"
              value={payment.cardNumber}
              onChangeText={(text) =>
                setPayment((prev) => ({ ...prev, cardNumber: text }))
              }
              keyboardType="numeric"
            />
            <TouchableOpacity
              onPress={showExpiryDatePicker}
              style={{
                backgroundColor: "#f3f4f6",
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 8,
                marginBottom: 15,
                width: "100%",
                alignItems: "flex-start",
              }}
            >
              <Text style={{ fontSize: 16, color: "#333" }}>
                {payment.cardExpiry || "Select Expiry Date (MM/YY)"}
              </Text>
            </TouchableOpacity>
            <TextInput
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg bg-white"
              placeholder="Card CVC"
              value={payment.cardCVC}
              onChangeText={(text) =>
                setPayment((prev) => ({ ...prev, cardCVC: text }))
              }
              keyboardType="numeric"
            />
          </>
        )}

        {/* Always display Billing Address field */}
        <TextInput
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg bg-white"
          placeholder="Billing Address"
          value={payment.billingAddress}
          onChangeText={(text) =>
            setPayment((prev) => ({ ...prev, billingAddress: text }))
          }
        />

        <TouchableOpacity
          style={{
            backgroundColor: "#9455f4",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 9999,
            marginBottom: 10,
            alignItems: "center",
          }}
          onPress={handleSave}
          disabled={loading}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date picker for Expiry Date */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          onChange={handleDateChange}
          mode="date"
          display="default"
          is24Hour={true}
        />
      )}
    </KeyboardAvoidingView>
  );
}
