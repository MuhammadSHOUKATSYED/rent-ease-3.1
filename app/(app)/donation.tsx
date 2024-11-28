import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; // Import expo-image-picker
import { supabase } from "@/config/supabase"; // Ensure your Supabase config is set
import { useSupabase } from '@/context/supabase-provider';

const DonationCenter = () => {
  const [selectedCategory, setSelectedCategory] = useState(null); 
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState([]); 
  const { user } = useSupabase();

  const categoryImages = {
    motors: require('../../assets/car.png'),
    property: require('../../assets/house.png'),
    mobiles: require('../../assets/mobile.png'),
    vehicles: require('../../assets/vehicle.png'),
    electronics: require('../../assets/responsive.png'),
    fashion: require('../../assets/brand.png'),
    appliances: require('../../assets/blender.png'),
    stationary: require('../../assets/svg.png'),
  };

  useEffect(() => {
	const fetchProductImages = async () => {
	  const loggedInUserId = user?.id;
  
	  try {
		// Query the product listings table to fetch images for a specific product (assuming you have a product ID)
		const { data, error } = await supabase
		  .from('donations')
		  .select('picture1, picture2, picture3, picture4')
		  .eq('profile_id', loggedInUserId) // Ensure the query filters based on logged-in user or relevant product
		  .order('created_at', { ascending: false })
		  .limit(1); // Ensure only the most recent product listing is fetched (or adjust as needed)
  
		if (error) throw error;
  
		if (data && data.length > 0) {
		  const product = data[0];
		  setImages([
			product.picture1_url,
			product.picture2_url,
			product.picture3_url,
			product.picture4_url,
		  ].filter(Boolean)); // Filter out null or undefined URLs
		}
	  } catch (error) {
		console.error("Error fetching product images:", error);
	  }
	};
  
	fetchProductImages();
  }, [user]);
  
  const handleCategorySelect = (category) => {
    setSelectedCategory(category === selectedCategory ? null : category); 
  };
  const handleImageUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission required", "You need to grant access to the media library.");
      return;
    }
  
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });
  
      if (!result.cancelled && result.assets?.length) {
        // Filter out duplicate images based on URI
        const selectedImages = result.assets.filter((asset) =>
          !images.some((image) => image.uri === asset.uri)
        ).map((asset) => ({
          uri: asset.uri,
        }));
  
        setImages((prevImages) => [...prevImages, ...selectedImages]);
      }
    } catch (err) {
      Alert.alert("Error", "An error occurred while picking the images.");
      console.error(err);
    }
  };
  
  const uploadImageToSupabase = async (uri, index) => {
    try {
      const response = await fetch(uri);
      const fileExt = uri.split('.').pop();
      const fileName = `${user?.id}_${new Date().getTime()}_${index}.${fileExt}`;
      const file = { uri, contentType: "image", name: fileName };
      const { data, error } = await supabase.storage
        .from('donations_pictures')
        .upload(fileName, file);

      if (error) {
        console.error("Error uploading image:", error.message);
        return null;
      }

      const { data: publicURL, error: urlError } = supabase
        .storage
        .from('donations_pictures')
        .getPublicUrl(data.path);

      if (urlError) {
        console.error("Error getting public URL:", urlError.message);
        return null;
      }

      return publicURL.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error.message);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory || !title || !description || !location) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    const loggedInUserId = user?.id;
    try {
      const imageUrls = [];
      for (let i = 0; i < images.length; i++) {
        const imageUrl = await uploadImageToSupabase(images[i].uri, i + 1);
        if (imageUrl) imageUrls.push(imageUrl);
      }

      const { data: productData, error: insertError } = await supabase
        .from('donations')
        .insert([{
          name: title,
          category: selectedCategory,
          address: location,
          description,
          profile_id: loggedInUserId,
          picture1: imageUrls[0] || null,
          picture2: imageUrls[1] || null,
          picture3: imageUrls[2] || null,
          picture4: imageUrls[3] || null,
          status: 'available',
          created_at: new Date(),
          updated_at: new Date(),
        }]);

      if (insertError) {
        console.error("Error inserting into product_listings:", insertError.message);
        Alert.alert("Error", insertError.message);
      } else {
        Alert.alert("Success", "Product added successfully!");
      }
    } catch (error) {
      console.error("Error during submit:", error.message);
      Alert.alert("Error", error.message);
    }
  };

  return (
     <View className="flex-1 bg-background mb-3">
      <ScrollView style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {Object.keys(categoryImages).map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => handleCategorySelect(category)}
            style={[
              styles.categoryItem,
              selectedCategory === category && styles.selectedCategory, 
            ]}
          >
            <Image source={categoryImages[category]} style={styles.categoryImage} />
            <Text style={styles.categoryText}>{category}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedCategory && (
        <View style={styles.selectedCategoryContainer}>
          <Text style={styles.label}>Selected Category:</Text>
          <Text>{selectedCategory}</Text>
        </View>
      )}
	  <View style={styles.imageUploadSection}>
  <Text style={styles.label}>Add Images *</Text>
  <View style={styles.imageUploadContainer}>
    <TouchableOpacity style={styles.imageUploadButton} onPress={handleImageUpload}>
      <Text style={styles.imageUploadText}>Upload Images</Text>
    </TouchableOpacity>
  </View>

  {/* Display Thumbnails of Selected Images */}
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {images.map((image, index) => (
      <Image
        key={index}
        source={{ uri: image.uri }} // Display selected image URI
        style={styles.uploadedImage}
      />
    ))}
  </ScrollView>

  <Text style={styles.imageInfo}>
    Max 4 images. 5MB max size accepted in .jpg, .jpeg, .png, or .gif formats.
  </Text>
</View>



      <Text style={styles.label}>Product Title *</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        placeholder="Enter title"
      />

      <Text style={styles.label}>Description *</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        style={styles.input}
        placeholder="Enter description"
        multiline
      />

      <Text style={styles.label}>Location *</Text>
      <TextInput
        value={location}
        onChangeText={setLocation}
        style={styles.input}
        placeholder="Enter location"
      />
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Post</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    margin: 15,
    fontSize: 30,
    fontWeight: 'bold',
  },
  categoryScroll: {
    paddingHorizontal: 10,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 15,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 5,
  },
  selectedCategory: {
    borderColor: '#311465',
    borderWidth: 2,
  },
  categoryImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    marginTop: 5,
  },
  selectedCategoryContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  imageUploadSection: {
    marginVertical: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  imageUploadContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  imageUploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#311465',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#E9D9FD',
  },
  imageUploadText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#311465',
  },
  imageInfo: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  currency: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
  },
  nextButton: {
    backgroundColor: '#004D40',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ownershipSection: {
    marginVertical: 16,
  },
  sharedOwnerSection: {
    marginTop: 16,
  },
  ownerInfoContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f4f4f4',
    borderRadius: 8,
  },
  ownerInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerProfilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  defaultProfilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  ownerDetails: {
    flexDirection: 'column',
  },
  submitButton: {
	backgroundColor: '#9455f4', // Greenish background color
	paddingVertical: 16,        // Padding to make the button taller
	paddingHorizontal: 32,      // Padding to make the button wider
	borderRadius: 8,            // Rounded corners
	alignItems: 'center',       // Center text horizontally
	justifyContent: 'center',   // Center text vertically
	marginTop: 20, 
  marginBottom: 30,             // Margin to separate from other elements
  },
  
  submitButtonText: {
	color: '#fff',              // White text color
	fontSize: 16,               // Slightly larger font size
	fontWeight: 'bold',         // Bold text
  },
  uploadedImagesContainer: {
	flexDirection: 'row',
	flexWrap: 'wrap',
	marginTop: 10,
	justifyContent: 'space-between',
  },
  
  uploadedImage: {
	width: 80,
	height: 80,
	marginRight: 10,
	marginBottom: 10,
	borderRadius: 8,
  }
  
});

export default DonationCenter;
