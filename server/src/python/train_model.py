import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

class VolleyballFormNet(nn.Module):
    def __init__(self, input_size=99):  # 33 keypoints * 3 coordinates (x, y, z)
        super(VolleyballFormNet, self).__init__()
        self.fc1 = nn.Linear(input_size, 64)
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, 16)
        self.fc_score = nn.Linear(16, 1)  # Form score
        self.fc_features = nn.Linear(16, 5)  # Feature detection

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        x = torch.relu(self.fc3(x))
        score = torch.sigmoid(self.fc_score(x))
        features = torch.sigmoid(self.fc_features(x))
        return score, features

def generate_synthetic_data(num_samples=1000):
    # Generate synthetic training data
    # Perfect form
    perfect_form = np.array([
        # Simplified keypoints for demonstration
        0.5, 0.5, 0.0,  # Hip center
        0.5, 0.7, 0.0,  # Spine
        0.5, 0.9, 0.0,  # Neck
        0.3, 0.7, 0.0,  # Left shoulder
        0.7, 0.7, 0.0,  # Right shoulder
        0.3, 0.5, 0.0,  # Left elbow
        0.7, 0.5, 0.0,  # Right elbow
        0.3, 0.3, 0.0,  # Left wrist
        0.7, 0.3, 0.0,  # Right wrist
        0.4, 0.3, 0.0,  # Left hip
        0.6, 0.3, 0.0,  # Right hip
    ])

    X = []
    y_scores = []
    y_features = []

    for _ in range(num_samples):
        # Add random variations to perfect form
        noise = np.random.normal(0, 0.1, perfect_form.shape)
        sample = perfect_form + noise

        # Calculate synthetic score and features
        deviation = np.mean(np.abs(noise))
        score = 1.0 - deviation
        features = [
            1.0 - deviation,  # Overall form
            1.0 - np.abs(noise[6:12]).mean(),  # Arm position
            1.0 - np.abs(noise[0:3]).mean(),  # Hip position
            1.0 - np.abs(noise[3:6]).mean(),  # Spine alignment
            1.0 - np.abs(noise[12:]).mean(),  # Lower body position
        ]

        X.append(sample)
        y_scores.append([score])
        y_features.append(features)

    return (
        torch.FloatTensor(X),
        torch.FloatTensor(y_scores),
        torch.FloatTensor(y_features)
    )

def train_model():
    # Generate synthetic data
    X_train, y_scores, y_features = generate_synthetic_data()

    # Initialize model
    model = VolleyballFormNet(input_size=33)
    optimizer = optim.Adam(model.parameters())
    score_criterion = nn.MSELoss()
    features_criterion = nn.MSELoss()

    # Training loop
    for epoch in range(100):
        optimizer.zero_grad()
        score_pred, features_pred = model(X_train)
        loss_score = score_criterion(score_pred, y_scores)
        loss_features = features_criterion(features_pred, y_features)
        loss = loss_score + loss_features
        loss.backward()
        optimizer.step()

        if (epoch + 1) % 10 == 0:
            print(f'Epoch [{epoch+1}/100], Loss: {loss.item():.4f}')

    return model

def export_model(model, output_path):
    # Create dummy input
    dummy_input = torch.randn(1, 33)
    
    # Export the model
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['score', 'features'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'score': {0: 'batch_size'},
            'features': {0: 'batch_size'}
        }
    )
    print(f"Model exported to {output_path}")

if __name__ == "__main__":
    # Train the model
    model = train_model()
    
    # Export the model
    export_model(model, "volleyball_analysis.onnx") 